-- Entrega 7: perfiles de cada marca en cada red y su auditoría (plantilla 2, "Auditoría de redes sociales").
--   SITIO -> canal · ENLACE -> enlace · Nombre de perfil -> nombre_perfil
--   Seguidores / Seguidores (hoy) (columnas duplicadas en la plantilla) -> seguidores
--   Fecha de la última actividad -> ultima_actividad · Frecuencia de publicaciones -> frecuencia
--   Tráfico de referencia mensual -> trafico_referencia · Clics por publicación -> clics_por_publicacion
--   ALCANZAR (alcance) -> alcance
-- Las columnas "(el mes pasado)", "% de cambio" y "cambio" ya no se escriben: se calculan con el
-- historial (un registro por perfil y fecha), en lugar de sobrescribir la foto anterior.

create table public.cuentas_red (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid not null references public.espacios (id) on delete cascade,
  marca_id uuid not null references public.marcas (id) on delete cascade,
  canal text not null check (char_length(btrim(canal)) between 1 and 60),
  nombre_perfil text not null default '' check (char_length(nombre_perfil) <= 120),
  enlace text not null default '' check (enlace = '' or enlace ~* '^https?://'),
  frecuencia_objetivo text not null default '' check (char_length(frecuencia_objetivo) <= 120),
  activa boolean not null default true,
  creado_por uuid references auth.users (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_por uuid references auth.users (id) on delete set null,
  actualizado_en timestamptz not null default now()
);
create unique index cuentas_red_unica on public.cuentas_red (marca_id, lower(canal), lower(nombre_perfil));
create index cuentas_red_espacio_idx on public.cuentas_red (espacio_id);
create index cuentas_red_creado_por_idx on public.cuentas_red (creado_por);
create index cuentas_red_actualizado_por_idx on public.cuentas_red (actualizado_por);

create trigger cuentas_red_auditar before insert or update on public.cuentas_red
for each row execute function public.auditar();

create or replace function public.cuentas_red_coherencia()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.marca_id := old.marca_id;
  end if;
  select m.espacio_id into new.espacio_id from public.marcas m where m.id = new.marca_id;
  if new.espacio_id is null then
    raise exception 'La marca no existe.' using errcode = '23503';
  end if;
  new.canal := btrim(new.canal);
  return new;
end;
$$;
revoke execute on function public.cuentas_red_coherencia() from public, anon, authenticated;
create trigger cuentas_red_coherencia before insert or update on public.cuentas_red
for each row execute function public.cuentas_red_coherencia();

create table public.registros_auditoria (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references public.cuentas_red (id) on delete cascade,
  espacio_id uuid not null references public.espacios (id) on delete cascade,
  fecha date not null,
  seguidores bigint check (seguidores >= 0),
  ultima_actividad date,
  frecuencia text not null default '' check (char_length(frecuencia) <= 120),
  trafico_referencia bigint check (trafico_referencia >= 0),
  clics_por_publicacion numeric check (clics_por_publicacion >= 0),
  alcance bigint check (alcance >= 0),
  notas text not null default '' check (char_length(notas) <= 1000),
  creado_por uuid references auth.users (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_por uuid references auth.users (id) on delete set null,
  actualizado_en timestamptz not null default now(),
  unique (cuenta_id, fecha)
);
create index registros_auditoria_espacio_idx on public.registros_auditoria (espacio_id);
create index registros_auditoria_creado_por_idx on public.registros_auditoria (creado_por);
create index registros_auditoria_actualizado_por_idx on public.registros_auditoria (actualizado_por);

create trigger registros_auditoria_auditar before insert or update on public.registros_auditoria
for each row execute function public.auditar();

create or replace function public.registros_auditoria_coherencia()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.cuenta_id := old.cuenta_id;
  end if;
  select c.espacio_id into new.espacio_id from public.cuentas_red c where c.id = new.cuenta_id;
  if new.espacio_id is null then
    raise exception 'El perfil no existe.' using errcode = '23503';
  end if;
  return new;
end;
$$;
revoke execute on function public.registros_auditoria_coherencia() from public, anon, authenticated;
create trigger registros_auditoria_coherencia before insert or update on public.registros_auditoria
for each row execute function public.registros_auditoria_coherencia();

alter table public.cuentas_red enable row level security;
alter table public.registros_auditoria enable row level security;

create policy "miembros ven perfiles" on public.cuentas_red for select to authenticated using (privado.es_miembro(espacio_id));
create policy "editores crean perfiles" on public.cuentas_red for insert to authenticated
  with check (privado.tiene_rol(espacio_id, '{administrador,editor}'));
create policy "editores editan perfiles" on public.cuentas_red for update to authenticated
  using (privado.tiene_rol(espacio_id, '{administrador,editor}')) with check (privado.tiene_rol(espacio_id, '{administrador,editor}'));
create policy "editores borran perfiles" on public.cuentas_red for delete to authenticated
  using (privado.tiene_rol(espacio_id, '{administrador,editor}'));

create policy "miembros ven auditorías" on public.registros_auditoria for select to authenticated using (privado.es_miembro(espacio_id));
create policy "editores registran auditorías" on public.registros_auditoria for insert to authenticated
  with check (privado.tiene_rol(espacio_id, '{administrador,editor}'));
create policy "editores corrigen auditorías" on public.registros_auditoria for update to authenticated
  using (privado.tiene_rol(espacio_id, '{administrador,editor}')) with check (privado.tiene_rol(espacio_id, '{administrador,editor}'));
create policy "editores borran auditorías" on public.registros_auditoria for delete to authenticated
  using (privado.tiene_rol(espacio_id, '{administrador,editor}'));

revoke all on public.cuentas_red, public.registros_auditoria from anon;
