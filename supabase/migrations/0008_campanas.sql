-- Entrega 8: campañas (plantilla 5, "Plan multicanal": MES + TEMA del mes por canal).
-- Una campaña agrupa publicaciones de una marca con un tema y unas fechas.

create table public.campanas (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid not null references public.espacios (id) on delete cascade,
  marca_id uuid not null references public.marcas (id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 120),
  tema text not null default '' check (char_length(tema) <= 500),
  objetivo text not null default '' check (char_length(objetivo) <= 1000),
  etapa public.etapa_embudo,
  inicio date,
  fin date,
  notas text not null default '' check (char_length(notas) <= 3000),
  creado_por uuid references auth.users (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_por uuid references auth.users (id) on delete set null,
  actualizado_en timestamptz not null default now(),
  constraint campanas_fechas check (inicio is null or fin is null or fin >= inicio)
);
create index campanas_espacio_idx on public.campanas (espacio_id);
create index campanas_marca_idx on public.campanas (marca_id);
create index campanas_creado_por_idx on public.campanas (creado_por);
create index campanas_actualizado_por_idx on public.campanas (actualizado_por);

create trigger campanas_auditar before insert or update on public.campanas
for each row execute function public.auditar();

create or replace function public.campanas_coherencia()
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
  return new;
end;
$$;
revoke execute on function public.campanas_coherencia() from public, anon, authenticated;
create trigger campanas_coherencia before insert or update on public.campanas
for each row execute function public.campanas_coherencia();

alter table public.campanas enable row level security;
create policy "miembros ven campañas" on public.campanas for select to authenticated using (privado.es_miembro(espacio_id));
create policy "editores crean campañas" on public.campanas for insert to authenticated
  with check (privado.tiene_rol(espacio_id, '{administrador,editor}'));
create policy "editores editan campañas" on public.campanas for update to authenticated
  using (privado.tiene_rol(espacio_id, '{administrador,editor}')) with check (privado.tiene_rol(espacio_id, '{administrador,editor}'));
create policy "editores borran campañas" on public.campanas for delete to authenticated
  using (privado.tiene_rol(espacio_id, '{administrador,editor}'));
revoke all on public.campanas from anon;

-- Publicación -> campaña (opcional). Si se borra la campaña, las publicaciones se conservan.
alter table public.publicaciones add column campana_id uuid references public.campanas (id) on delete set null;
create index publicaciones_campana_idx on public.publicaciones (campana_id);
grant update (campana_id) on public.publicaciones to authenticated;

-- La campaña debe ser de la misma marca que la publicación
create or replace function public.publicaciones_campana_de_marca()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.campana_id is not null and not exists (
    select 1 from public.campanas c where c.id = new.campana_id and c.marca_id = new.marca_id
  ) then
    raise exception 'La campaña debe ser de la misma marca.' using errcode = '23514', hint = 'campana_otra_marca';
  end if;
  return new;
end;
$$;
revoke execute on function public.publicaciones_campana_de_marca() from public, anon, authenticated;
create trigger publicaciones_zz_campana before insert or update of campana_id, marca_id on public.publicaciones
for each row execute function public.publicaciones_campana_de_marca();
