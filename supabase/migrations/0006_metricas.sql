-- Entrega 6: métricas de cada publicación en cada red (plantilla 7, "Informe de redes sociales").
--   Retweets -> compartidos · GUSTOS -> me_gusta · Menciones -> menciones · Clics -> clics · POTENCIAL -> alcance
--   Se añaden impresiones, comentarios y guardados (decisión 6 de la Etapa 1).
-- Todas las cifras se escriben a mano: origen = 'manual'. No hay conexión con las redes (v1).
-- Se puede medir varias veces (p. ej. a las 24 h y a los 7 días), una vez por día.

create type public.origen_dato as enum ('manual');

create table public.metricas (
  id uuid primary key default gen_random_uuid(),
  publicacion_canal_id uuid not null references public.publicacion_canales (id) on delete cascade,
  publicacion_id uuid not null references public.publicaciones (id) on delete cascade,
  espacio_id uuid not null references public.espacios (id) on delete cascade,
  medido_el date not null,
  alcance bigint check (alcance >= 0),
  impresiones bigint check (impresiones >= 0),
  me_gusta bigint check (me_gusta >= 0),
  comentarios bigint check (comentarios >= 0),
  compartidos bigint check (compartidos >= 0),
  guardados bigint check (guardados >= 0),
  clics bigint check (clics >= 0),
  menciones bigint check (menciones >= 0),
  origen public.origen_dato not null default 'manual',
  notas text not null default '' check (char_length(notas) <= 1000),
  creado_por uuid references auth.users (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_por uuid references auth.users (id) on delete set null,
  actualizado_en timestamptz not null default now(),
  unique (publicacion_canal_id, medido_el),
  constraint metricas_algun_valor check (
    coalesce(alcance, impresiones, me_gusta, comentarios, compartidos, guardados, clics, menciones) is not null
  )
);
create index metricas_espacio_idx on public.metricas (espacio_id);
create index metricas_publicacion_idx on public.metricas (publicacion_id);
create index metricas_creado_por_idx on public.metricas (creado_por);
create index metricas_actualizado_por_idx on public.metricas (actualizado_por);

create trigger metricas_auditar before insert or update on public.metricas
for each row execute function public.auditar();

create or replace function public.metricas_coherencia()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.publicacion_canal_id := old.publicacion_canal_id;
  end if;
  select c.publicacion_id, c.espacio_id into new.publicacion_id, new.espacio_id
  from public.publicacion_canales c where c.id = new.publicacion_canal_id;
  if new.espacio_id is null then
    raise exception 'La red de la publicación no existe.' using errcode = '23503';
  end if;
  new.origen := 'manual';
  return new;
end;
$$;
revoke execute on function public.metricas_coherencia() from public, anon, authenticated;
create trigger metricas_coherencia before insert or update on public.metricas
for each row execute function public.metricas_coherencia();

alter table public.metricas enable row level security;

create policy "miembros ven métricas" on public.metricas for select to authenticated
  using (privado.es_miembro(espacio_id));
create policy "editores registran métricas" on public.metricas for insert to authenticated
  with check (privado.tiene_rol(espacio_id, '{administrador,editor}'));
create policy "editores corrigen métricas" on public.metricas for update to authenticated
  using (privado.tiene_rol(espacio_id, '{administrador,editor}'))
  with check (privado.tiene_rol(espacio_id, '{administrador,editor}'));
create policy "editores borran métricas" on public.metricas for delete to authenticated
  using (privado.tiene_rol(espacio_id, '{administrador,editor}'));

revoke all on public.metricas from anon;
