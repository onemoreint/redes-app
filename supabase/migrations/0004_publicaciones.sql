-- Entrega 3: publicaciones (fusión de las plantillas 3 Horario, 4 Plan de contenido,
-- 5 Plan multicanal y 6 Plan de publicación con tablero).
--
--   Horario:           fecha, estado, temas, texto ("CORREO"), hashtags, nº de caracteres, marca por canal
--   Plan de contenido: idea/tema, categoría, etapa del comprador, información adicional, fecha publicada,
--                      estado; por canal: título, autor, enlace, KPI, notas
--   Multicanal:        tema del mes, etapa del embudo, tipo de contenido, llamado a la acción, asignado a, fecha
--   Tablero:           semana/día (se calculan de la fecha), tipo texto/imagen/video, marca por canal
--
-- El nº de caracteres no se guarda: se calcula del texto. "Atrasada" no es un estado: se calcula.

create type public.estado_publicacion as enum
  ('idea', 'borrador', 'en_revision', 'aprobado', 'programado', 'publicado', 'en_pausa', 'descartado');
create type public.etapa_embudo as enum ('conciencia', 'investigacion', 'decision', 'compra', 'retencion');

create table public.publicaciones (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid not null references public.espacios (id) on delete cascade,
  marca_id uuid not null references public.marcas (id) on delete cascade,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 200),
  info_adicional text not null default '' check (char_length(info_adicional) <= 2000),
  categoria text not null default '' check (char_length(categoria) <= 60),
  etapa public.etapa_embudo,
  tipos text[] not null default '{}' check (cardinality(tipos) <= 10),
  texto text not null default '' check (char_length(texto) <= 10000),
  hashtags text not null default '' check (char_length(hashtags) <= 1000),
  cta text not null default '' check (char_length(cta) <= 300),
  recursos text not null default '' check (char_length(recursos) <= 3000),
  responsable_id uuid references auth.users (id) on delete set null,
  fecha_prevista timestamptz,
  estado public.estado_publicacion not null default 'idea',
  estado_anterior public.estado_publicacion,
  notas text not null default '' check (char_length(notas) <= 3000),
  creado_por uuid references auth.users (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_por uuid references auth.users (id) on delete set null,
  actualizado_en timestamptz not null default now(),
  constraint programado_con_fecha check (estado <> 'programado' or fecha_prevista is not null)
);
create index publicaciones_espacio_fecha_idx on public.publicaciones (espacio_id, fecha_prevista);
create index publicaciones_marca_idx on public.publicaciones (marca_id);
create index publicaciones_responsable_idx on public.publicaciones (responsable_id);
create index publicaciones_creado_por_idx on public.publicaciones (creado_por);
create index publicaciones_actualizado_por_idx on public.publicaciones (actualizado_por);

create trigger publicaciones_auditar before insert or update on public.publicaciones
for each row execute function public.auditar();

-- Coherencia: espacio = el de la marca; marca del mismo espacio al editar; responsable miembro;
-- al pausar se recuerda el estado anterior.
create or replace function public.publicaciones_coherencia()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  esp uuid;
begin
  select m.espacio_id into esp from public.marcas m where m.id = new.marca_id;
  if esp is null then
    raise exception 'La marca no existe.' using errcode = '23503';
  end if;
  if tg_op = 'UPDATE' and esp <> old.espacio_id then
    raise exception 'La publicación no puede pasar a una marca de otro espacio.' using errcode = '42501';
  end if;
  new.espacio_id := esp;

  -- Solo se comprueba al asignar (si alguien sale del espacio, lo ya asignado se conserva)
  if new.responsable_id is not null
     and (tg_op = 'INSERT' or new.responsable_id is distinct from old.responsable_id)
     and not exists (
    select 1 from public.miembros where espacio_id = esp and usuario_id = new.responsable_id
  ) then
    raise exception 'El responsable debe ser miembro del espacio.' using errcode = '23514', hint = 'responsable_no_miembro';
  end if;

  if new.estado = 'en_pausa' then
    if tg_op = 'INSERT' then
      new.estado_anterior := coalesce(new.estado_anterior, 'borrador');
    elsif old.estado <> 'en_pausa' then
      new.estado_anterior := old.estado;
    else
      new.estado_anterior := old.estado_anterior;
    end if;
  else
    new.estado_anterior := null;
  end if;

  new.tipos := array(select distinct t from unnest(new.tipos) t where btrim(t) <> '' order by 1);
  return new;
end;
$$;
revoke execute on function public.publicaciones_coherencia() from public, anon, authenticated;
create trigger publicaciones_coherencia before insert or update on public.publicaciones
for each row execute function public.publicaciones_coherencia();

-- La misma pieza en cada red
create table public.publicacion_canales (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.publicaciones (id) on delete cascade,
  espacio_id uuid not null references public.espacios (id) on delete cascade,
  canal text not null check (char_length(btrim(canal)) between 1 and 60),
  texto_adaptado text not null default '' check (char_length(texto_adaptado) <= 10000),
  kpi_esperado text not null default '' check (char_length(kpi_esperado) <= 200),
  enlace_publicado text not null default '' check (enlace_publicado = '' or enlace_publicado ~* '^https?://'),
  fecha_publicada timestamptz,
  notas text not null default '' check (char_length(notas) <= 2000),
  creado_por uuid references auth.users (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_por uuid references auth.users (id) on delete set null,
  actualizado_en timestamptz not null default now(),
  unique (publicacion_id, canal)
);
create index publicacion_canales_espacio_idx on public.publicacion_canales (espacio_id);
create index publicacion_canales_creado_por_idx on public.publicacion_canales (creado_por);
create index publicacion_canales_actualizado_por_idx on public.publicacion_canales (actualizado_por);

create trigger publicacion_canales_auditar before insert or update on public.publicacion_canales
for each row execute function public.auditar();

create or replace function public.publicacion_canales_coherencia()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.publicacion_id := old.publicacion_id;
  end if;
  select p.espacio_id into new.espacio_id from public.publicaciones p where p.id = new.publicacion_id;
  if new.espacio_id is null then
    raise exception 'La publicación no existe.' using errcode = '23503';
  end if;
  return new;
end;
$$;
revoke execute on function public.publicacion_canales_coherencia() from public, anon, authenticated;
create trigger publicacion_canales_coherencia before insert or update on public.publicacion_canales
for each row execute function public.publicacion_canales_coherencia();

-- Reglas de acceso: ver = miembros; crear/editar/borrar = administrador o editor.
-- (La aprobación por revisores llega en la entrega 4.)
alter table public.publicaciones enable row level security;
alter table public.publicacion_canales enable row level security;

create policy "miembros ven publicaciones" on public.publicaciones for select to authenticated
  using (privado.es_miembro(espacio_id));
create policy "editores crean publicaciones" on public.publicaciones for insert to authenticated
  with check (privado.tiene_rol(espacio_id, '{administrador,editor}'));
create policy "editores editan publicaciones" on public.publicaciones for update to authenticated
  using (privado.tiene_rol(espacio_id, '{administrador,editor}'))
  with check (privado.tiene_rol(espacio_id, '{administrador,editor}'));
create policy "editores borran publicaciones" on public.publicaciones for delete to authenticated
  using (privado.tiene_rol(espacio_id, '{administrador,editor}'));

create policy "miembros ven canales" on public.publicacion_canales for select to authenticated
  using (privado.es_miembro(espacio_id));
create policy "editores crean canales" on public.publicacion_canales for insert to authenticated
  with check (privado.tiene_rol(espacio_id, '{administrador,editor}'));
create policy "editores editan canales" on public.publicacion_canales for update to authenticated
  using (privado.tiene_rol(espacio_id, '{administrador,editor}'))
  with check (privado.tiene_rol(espacio_id, '{administrador,editor}'));
create policy "editores borran canales" on public.publicacion_canales for delete to authenticated
  using (privado.tiene_rol(espacio_id, '{administrador,editor}'));

revoke all on public.publicaciones, public.publicacion_canales from anon;
-- estado_anterior lo gestiona la base de datos
revoke update on public.publicaciones from authenticated;
grant update (marca_id, titulo, info_adicional, categoria, etapa, tipos, texto, hashtags, cta, recursos,
              responsable_id, fecha_prevista, estado, notas) on public.publicaciones to authenticated;
