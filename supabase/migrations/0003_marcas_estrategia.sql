-- Entrega 2: marcas, estrategia (plantilla "Plan estratégico de redes sociales") y objetivos medibles.
--
-- Correspondencia con la plantilla original (hoja "Social Media Strategic Plan"):
--   Investigación - Descubrimiento - Análisis -> empresa, mision, vision, publico, mensaje, fortalezas, debilidades
--   Análisis competitivo                     -> competencia, fortalezas_competencia, ventaja, diferenciacion, obstaculos, beneficios
--   Planear: Objetivos "Qué y cómo" (x5) y "Objetivos medibles" por red -> tabla objetivos
--   Ejecutar - implementar - lanzar (6 ítems) -> check_* (casillas)
--   Medida - Métricas - Track                 -> medir_estado_semanal, medir_crecimiento, medir_compromiso, medir_influencia, evaluacion
--   Evaluación de objetivos / revisados / nuevos (por red) -> objetivos.estado + objetivos.nota_revision

-- ---------------------------------------------------------------------------
-- Auditoría genérica: quién creó / modificó y cuándo (no se puede falsificar)
-- ---------------------------------------------------------------------------
create or replace function public.auditar()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.creado_por := coalesce(auth.uid(), new.creado_por);
    new.creado_en := now();
    new.actualizado_por := new.creado_por;
    new.actualizado_en := now();
  else
    new.creado_por := old.creado_por;
    new.creado_en := old.creado_en;
    new.actualizado_por := coalesce(auth.uid(), old.actualizado_por);
    new.actualizado_en := now();
  end if;
  return new;
end;
$$;
revoke execute on function public.auditar() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Marcas
-- ---------------------------------------------------------------------------
create table public.marcas (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid not null references public.espacios (id) on delete cascade,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 80),
  descripcion text not null default '' check (char_length(descripcion) <= 2000),
  color text not null default '#0f766e' check (color ~ '^#[0-9a-fA-F]{6}$'),
  tono text not null default '' check (char_length(tono) <= 500),
  publico_objetivo text not null default '' check (char_length(publico_objetivo) <= 2000),
  frecuencia_publicacion text not null default '' check (char_length(frecuencia_publicacion) <= 200),
  archivada boolean not null default false,
  creado_por uuid references auth.users (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_por uuid references auth.users (id) on delete set null,
  actualizado_en timestamptz not null default now()
);
create index marcas_espacio_idx on public.marcas (espacio_id);
create index marcas_creado_por_idx on public.marcas (creado_por);
create index marcas_actualizado_por_idx on public.marcas (actualizado_por);
create unique index marcas_nombre_unico on public.marcas (espacio_id, lower(btrim(nombre)));

create trigger marcas_auditar before insert or update on public.marcas
for each row execute function public.auditar();

-- Una marca no cambia de espacio
create or replace function public.marcas_espacio_fijo()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.espacio_id := old.espacio_id;
  return new;
end;
$$;
revoke execute on function public.marcas_espacio_fijo() from public, anon, authenticated;
create trigger marcas_espacio_fijo before update on public.marcas
for each row execute function public.marcas_espacio_fijo();

-- ---------------------------------------------------------------------------
-- Estrategia: una por marca, creada automáticamente
-- ---------------------------------------------------------------------------
create table public.estrategias (
  marca_id uuid primary key references public.marcas (id) on delete cascade,
  espacio_id uuid not null references public.espacios (id) on delete cascade,
  -- Investigación
  empresa text not null default '',
  mision text not null default '',
  vision text not null default '',
  publico text not null default '',
  mensaje text not null default '',
  fortalezas text not null default '',
  debilidades text not null default '',
  -- Análisis competitivo
  competencia text not null default '',
  fortalezas_competencia text not null default '',
  ventaja text not null default '',
  diferenciacion text not null default '',
  obstaculos text not null default '',
  beneficios text not null default '',
  -- Ejecutar: lista de comprobación de la plantilla
  check_mensaje boolean not null default false,
  check_grafica boolean not null default false,
  check_monitoreo boolean not null default false,
  check_id_social boolean not null default false,
  check_publicacion_diaria boolean not null default false,
  check_informes boolean not null default false,
  -- Medir
  medir_estado_semanal text not null default '',
  medir_crecimiento text not null default '',
  medir_compromiso text not null default '',
  medir_influencia text not null default '',
  evaluacion text not null default '',
  creado_por uuid references auth.users (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_por uuid references auth.users (id) on delete set null,
  actualizado_en timestamptz not null default now(),
  constraint estrategias_textos_largo check (
    greatest(
      char_length(empresa), char_length(mision), char_length(vision), char_length(publico), char_length(mensaje),
      char_length(fortalezas), char_length(debilidades), char_length(competencia), char_length(fortalezas_competencia),
      char_length(ventaja), char_length(diferenciacion), char_length(obstaculos), char_length(beneficios),
      char_length(medir_estado_semanal), char_length(medir_crecimiento), char_length(medir_compromiso),
      char_length(medir_influencia), char_length(evaluacion)
    ) <= 5000
  )
);
create index estrategias_espacio_idx on public.estrategias (espacio_id);
create index estrategias_creado_por_idx on public.estrategias (creado_por);
create index estrategias_actualizado_por_idx on public.estrategias (actualizado_por);

create trigger estrategias_auditar before insert or update on public.estrategias
for each row execute function public.auditar();

create or replace function public.estrategias_espacio_fijo()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.marca_id := old.marca_id;
  new.espacio_id := old.espacio_id;
  return new;
end;
$$;
revoke execute on function public.estrategias_espacio_fijo() from public, anon, authenticated;
create trigger estrategias_espacio_fijo before update on public.estrategias
for each row execute function public.estrategias_espacio_fijo();

create or replace function public.crear_estrategia_de_marca()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.estrategias (marca_id, espacio_id) values (new.id, new.espacio_id);
  return new;
end;
$$;
revoke execute on function public.crear_estrategia_de_marca() from public, anon, authenticated;
create trigger marcas_crear_estrategia after insert on public.marcas
for each row execute function public.crear_estrategia_de_marca();

-- ---------------------------------------------------------------------------
-- Objetivos medibles
-- ---------------------------------------------------------------------------
create type public.estado_objetivo as enum ('activo', 'logrado', 'revisado', 'abandonado');

create table public.objetivos (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas (id) on delete cascade,
  espacio_id uuid not null references public.espacios (id) on delete cascade,
  descripcion text not null check (char_length(btrim(descripcion)) between 1 and 1000),
  canal text check (canal is null or char_length(canal) <= 60),
  metrica text not null default '' check (char_length(metrica) <= 120),
  valor_inicial numeric check (valor_inicial is null or valor_inicial >= 0),
  valor_meta numeric check (valor_meta is null or valor_meta >= 0),
  fecha_limite date,
  estado public.estado_objetivo not null default 'activo',
  nota_revision text not null default '' check (char_length(nota_revision) <= 2000),
  creado_por uuid references auth.users (id) on delete set null,
  creado_en timestamptz not null default now(),
  actualizado_por uuid references auth.users (id) on delete set null,
  actualizado_en timestamptz not null default now()
);
create index objetivos_marca_idx on public.objetivos (marca_id);
create index objetivos_espacio_idx on public.objetivos (espacio_id);
create index objetivos_creado_por_idx on public.objetivos (creado_por);
create index objetivos_actualizado_por_idx on public.objetivos (actualizado_por);

create trigger objetivos_auditar before insert or update on public.objetivos
for each row execute function public.auditar();

-- El espacio del objetivo siempre es el de su marca (el navegador no lo decide)
create or replace function public.objetivos_espacio_de_marca()
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
revoke execute on function public.objetivos_espacio_de_marca() from public, anon, authenticated;
create trigger objetivos_espacio_de_marca before insert or update on public.objetivos
for each row execute function public.objetivos_espacio_de_marca();

-- ---------------------------------------------------------------------------
-- Reglas de acceso
--   Ver: cualquier miembro.  Crear y borrar marcas: administrador.
--   Editar marca, estrategia y objetivos: administrador o editor.
-- ---------------------------------------------------------------------------
alter table public.marcas enable row level security;
alter table public.estrategias enable row level security;
alter table public.objetivos enable row level security;

create policy "miembros ven marcas" on public.marcas for select to authenticated
  using (privado.es_miembro(espacio_id));
create policy "administrador crea marcas" on public.marcas for insert to authenticated
  with check (privado.tiene_rol(espacio_id, '{administrador}'));
create policy "administrador o editor edita marcas" on public.marcas for update to authenticated
  using (privado.tiene_rol(espacio_id, '{administrador,editor}'))
  with check (privado.tiene_rol(espacio_id, '{administrador,editor}'));
create policy "administrador borra marcas" on public.marcas for delete to authenticated
  using (privado.tiene_rol(espacio_id, '{administrador}'));

create policy "miembros ven estrategias" on public.estrategias for select to authenticated
  using (privado.es_miembro(espacio_id));
create policy "administrador o editor edita estrategias" on public.estrategias for update to authenticated
  using (privado.tiene_rol(espacio_id, '{administrador,editor}'))
  with check (privado.tiene_rol(espacio_id, '{administrador,editor}'));

create policy "miembros ven objetivos" on public.objetivos for select to authenticated
  using (privado.es_miembro(espacio_id));
create policy "administrador o editor crea objetivos" on public.objetivos for insert to authenticated
  with check (privado.tiene_rol(espacio_id, '{administrador,editor}'));
create policy "administrador o editor edita objetivos" on public.objetivos for update to authenticated
  using (privado.tiene_rol(espacio_id, '{administrador,editor}'))
  with check (privado.tiene_rol(espacio_id, '{administrador,editor}'));
create policy "administrador o editor borra objetivos" on public.objetivos for delete to authenticated
  using (privado.tiene_rol(espacio_id, '{administrador,editor}'));

revoke all on public.marcas, public.estrategias, public.objetivos from anon;
-- La estrategia nace con la marca y muere con ella: no se inserta ni borra desde el navegador
revoke insert, delete on public.estrategias from authenticated;
