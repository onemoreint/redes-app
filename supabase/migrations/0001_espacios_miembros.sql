-- Entrega 1: cuentas, espacios de trabajo, miembros, roles e invitaciones.
-- Toda separación de datos se aplica aquí con Row Level Security (RLS), no en la interfaz.

create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type public.rol_miembro as enum ('administrador', 'editor', 'revisor', 'lector');

-- ---------------------------------------------------------------------------
-- Perfiles: nombre y correo visibles para los compañeros de espacio
-- (auth.users no es accesible desde el navegador).
-- ---------------------------------------------------------------------------
create table public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email extensions.citext not null,
  nombre text not null default '' check (char_length(nombre) <= 120),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, email, nombre)
  values (
    new.id,
    new.email,
    coalesce(left(new.raw_user_meta_data ->> 'nombre', 120), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger al_crear_usuario
after insert on auth.users
for each row execute function public.crear_perfil_nuevo_usuario();

-- Mantener el correo sincronizado si el usuario lo cambia
create or replace function public.sincronizar_email_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.perfiles set email = new.email, actualizado_en = now() where id = new.id;
  return new;
end;
$$;

create trigger al_cambiar_email_usuario
after update of email on auth.users
for each row when (old.email is distinct from new.email)
execute function public.sincronizar_email_perfil();

-- ---------------------------------------------------------------------------
-- Espacios de trabajo
-- ---------------------------------------------------------------------------
create table public.espacios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(btrim(nombre)) between 1 and 80),
  zona_horaria text not null default 'America/Bogota',
  creado_por uuid references auth.users (id) on delete set null default auth.uid(),
  creado_en timestamptz not null default now(),
  actualizado_por uuid references auth.users (id) on delete set null,
  actualizado_en timestamptz not null default now()
);

-- Zona horaria válida (una restricción CHECK no admite subconsultas)
create or replace function public.validar_zona_horaria()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.zona_horaria) then
    raise exception 'Zona horaria no válida: %', new.zona_horaria using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger espacios_zona_horaria before insert or update of zona_horaria on public.espacios
for each row execute function public.validar_zona_horaria();

create table public.miembros (
  espacio_id uuid not null references public.espacios (id) on delete cascade,
  usuario_id uuid not null references auth.users (id) on delete cascade,
  rol public.rol_miembro not null,
  creado_en timestamptz not null default now(),
  primary key (espacio_id, usuario_id)
);
create index miembros_usuario_idx on public.miembros (usuario_id);

create table public.invitaciones (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid not null references public.espacios (id) on delete cascade,
  email extensions.citext not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  rol public.rol_miembro not null,
  token uuid not null unique default gen_random_uuid(),
  creada_por uuid references auth.users (id) on delete set null default auth.uid(),
  creada_en timestamptz not null default now(),
  expira_en timestamptz not null default now() + interval '7 days',
  aceptada_en timestamptz,
  aceptada_por uuid references auth.users (id) on delete set null
);
create index invitaciones_espacio_idx on public.invitaciones (espacio_id);
-- Una sola invitación pendiente por correo y espacio
create unique index invitaciones_pendiente_unica
  on public.invitaciones (espacio_id, email) where aceptada_en is null;

-- ---------------------------------------------------------------------------
-- Funciones de permisos (SECURITY DEFINER para no recursar en RLS)
-- ---------------------------------------------------------------------------
create or replace function public.rol_en_espacio(p_espacio uuid)
returns public.rol_miembro
language sql
stable
security definer
set search_path = ''
as $$
  select m.rol from public.miembros m
  where m.espacio_id = p_espacio and m.usuario_id = auth.uid();
$$;

create or replace function public.es_miembro(p_espacio uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.miembros m
    where m.espacio_id = p_espacio and m.usuario_id = auth.uid()
  );
$$;

create or replace function public.tiene_rol(p_espacio uuid, p_roles public.rol_miembro[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.rol_en_espacio(p_espacio) = any (p_roles), false);
$$;

-- ¿Comparten algún espacio el usuario actual y otro usuario?
create or replace function public.comparte_espacio_con(p_usuario uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.miembros a
    join public.miembros b on b.espacio_id = a.espacio_id
    where a.usuario_id = auth.uid() and b.usuario_id = p_usuario
  );
$$;

-- ---------------------------------------------------------------------------
-- Auditoría básica: quién y cuándo
-- ---------------------------------------------------------------------------
create or replace function public.marcar_actualizacion()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.actualizado_en := now();
  if tg_table_name = 'espacios' then
    new.actualizado_por := auth.uid();
    new.creado_por := old.creado_por;
    new.creado_en := old.creado_en;
  end if;
  return new;
end;
$$;

create trigger espacios_actualizacion before update on public.espacios
for each row execute function public.marcar_actualizacion();
create trigger perfiles_actualizacion before update on public.perfiles
for each row execute function public.marcar_actualizacion();

-- El correo del perfil no se puede editar desde el navegador: solo hay permiso
-- de UPDATE sobre la columna nombre (ver privilegios al final).

-- ---------------------------------------------------------------------------
-- Regla de negocio: cada espacio conserva al menos un administrador
-- ---------------------------------------------------------------------------
create or replace function public.proteger_ultimo_administrador()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  restantes int;
begin
  if old.rol <> 'administrador' then
    return coalesce(new, old);
  end if;
  if tg_op = 'UPDATE' and new.rol = 'administrador' then
    return new;
  end if;
  -- Si el espacio entero se está borrando, permitirlo
  if tg_op = 'DELETE' and not exists (select 1 from public.espacios where id = old.espacio_id) then
    return old;
  end if;
  select count(*) into restantes from public.miembros
  where espacio_id = old.espacio_id and rol = 'administrador' and usuario_id <> old.usuario_id;
  if restantes = 0 then
    raise exception 'El espacio debe tener al menos un administrador.'
      using errcode = 'P0001', hint = 'ultimo_administrador';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger miembros_ultimo_admin
before update or delete on public.miembros
for each row execute function public.proteger_ultimo_administrador();

-- Los miembros no pueden cambiar de espacio ni de usuario: solo el rol
create or replace function public.miembros_solo_rol()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.espacio_id <> old.espacio_id or new.usuario_id <> old.usuario_id then
    raise exception 'Solo se puede cambiar el rol de un miembro.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create trigger miembros_inmutables before update on public.miembros
for each row execute function public.miembros_solo_rol();

-- ---------------------------------------------------------------------------
-- Operaciones atómicas expuestas al navegador
-- ---------------------------------------------------------------------------

-- Crea un espacio y deja al creador como administrador, en una sola transacción.
create or replace function public.crear_espacio(p_nombre text, p_zona_horaria text default 'America/Bogota')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  nuevo uuid;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.' using errcode = '42501';
  end if;
  insert into public.espacios (nombre, zona_horaria, creado_por)
  values (btrim(p_nombre), coalesce(nullif(p_zona_horaria, ''), 'America/Bogota'), auth.uid())
  returning id into nuevo;
  insert into public.miembros (espacio_id, usuario_id, rol) values (nuevo, auth.uid(), 'administrador');
  return nuevo;
end;
$$;

-- Datos mínimos de una invitación para mostrarla a quien abre el enlace.
create or replace function public.ver_invitacion(p_token uuid)
returns table (espacio_nombre text, email text, rol public.rol_miembro, estado text)
language sql
stable
security definer
set search_path = ''
as $$
  select e.nombre,
         i.email::text,
         i.rol,
         case
           when i.aceptada_en is not null then 'aceptada'
           when i.expira_en < now() then 'vencida'
           else 'pendiente'
         end
  from public.invitaciones i
  join public.espacios e on e.id = i.espacio_id
  where i.token = p_token and auth.uid() is not null;
$$;

-- Acepta una invitación: solo funciona si el correo de la sesión coincide.
create or replace function public.aceptar_invitacion(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invitaciones%rowtype;
  mi_email text;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.' using errcode = '42501';
  end if;
  select * into inv from public.invitaciones where token = p_token for update;
  if not found then
    raise exception 'La invitación no existe o fue cancelada.' using errcode = 'P0001', hint = 'no_existe';
  end if;
  if inv.aceptada_en is not null then
    raise exception 'Esta invitación ya fue usada.' using errcode = 'P0001', hint = 'usada';
  end if;
  if inv.expira_en < now() then
    raise exception 'La invitación venció. Pide una nueva.' using errcode = 'P0001', hint = 'vencida';
  end if;
  select email::text into mi_email from public.perfiles where id = auth.uid();
  if lower(mi_email) <> lower(inv.email::text) then
    raise exception 'Esta invitación es para otro correo.' using errcode = 'P0001', hint = 'otro_correo';
  end if;
  insert into public.miembros (espacio_id, usuario_id, rol)
  values (inv.espacio_id, auth.uid(), inv.rol)
  on conflict (espacio_id, usuario_id) do nothing;
  update public.invitaciones set aceptada_en = now(), aceptada_por = auth.uid() where id = inv.id;
  return inv.espacio_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.perfiles enable row level security;
alter table public.espacios enable row level security;
alter table public.miembros enable row level security;
alter table public.invitaciones enable row level security;

-- Perfiles
create policy "ver mi perfil y el de compañeros" on public.perfiles
  for select to authenticated
  using (id = (select auth.uid()) or public.comparte_espacio_con(id));
create policy "editar mi perfil" on public.perfiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Espacios (se crean con crear_espacio; no hay política de insert)
create policy "ver espacios donde soy miembro" on public.espacios
  for select to authenticated using (public.es_miembro(id));
create policy "administrador edita el espacio" on public.espacios
  for update to authenticated
  using (public.tiene_rol(id, '{administrador}')) with check (public.tiene_rol(id, '{administrador}'));
create policy "administrador borra el espacio" on public.espacios
  for delete to authenticated using (public.tiene_rol(id, '{administrador}'));

-- Miembros (se agregan con crear_espacio o aceptar_invitacion)
create policy "ver miembros de mis espacios" on public.miembros
  for select to authenticated using (public.es_miembro(espacio_id));
create policy "administrador cambia roles" on public.miembros
  for update to authenticated
  using (public.tiene_rol(espacio_id, '{administrador}'))
  with check (public.tiene_rol(espacio_id, '{administrador}'));
create policy "administrador quita miembros o yo salgo" on public.miembros
  for delete to authenticated
  using (public.tiene_rol(espacio_id, '{administrador}') or usuario_id = (select auth.uid()));

-- Invitaciones: solo administradores
create policy "administrador ve invitaciones" on public.invitaciones
  for select to authenticated using (public.tiene_rol(espacio_id, '{administrador}'));
create policy "administrador crea invitaciones" on public.invitaciones
  for insert to authenticated
  with check (public.tiene_rol(espacio_id, '{administrador}') and creada_por = (select auth.uid()));
create policy "administrador cancela invitaciones" on public.invitaciones
  for delete to authenticated using (public.tiene_rol(espacio_id, '{administrador}'));

-- ---------------------------------------------------------------------------
-- Privilegios: el rol anónimo no toca nada; las columnas sensibles no se editan
-- ---------------------------------------------------------------------------
revoke all on public.perfiles, public.espacios, public.miembros, public.invitaciones from anon;
revoke insert, update, delete on public.perfiles from authenticated;
grant update (nombre) on public.perfiles to authenticated;
revoke insert, update on public.espacios from authenticated;
grant update (nombre, zona_horaria) on public.espacios to authenticated;
revoke insert, update on public.miembros from authenticated;
grant update (rol) on public.miembros to authenticated;
revoke update on public.invitaciones from authenticated;

revoke execute on function public.crear_espacio(text, text) from public, anon;
revoke execute on function public.aceptar_invitacion(uuid) from public, anon;
revoke execute on function public.ver_invitacion(uuid) from public, anon;
revoke execute on function public.crear_perfil_nuevo_usuario() from public, anon, authenticated;
revoke execute on function public.sincronizar_email_perfil() from public, anon, authenticated;
grant execute on function public.crear_espacio(text, text) to authenticated;
grant execute on function public.aceptar_invitacion(uuid) to authenticated;
grant execute on function public.ver_invitacion(uuid) to authenticated;
