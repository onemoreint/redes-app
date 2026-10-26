-- Entrega 4: revisión y aprobación de publicaciones.
--   - Comentarios por publicación (revisores incluidos; lectores solo leen).
--   - Historial inalterable de solicitudes, aprobaciones y devoluciones.
--   - Los cambios de estado de la revisión pasan por funciones que comprueban rol y estado,
--     así un revisor puede aprobar sin tener permiso para editar la publicación.

create type public.tipo_comentario as enum ('comentario', 'solicitud', 'aprobacion', 'devolucion');

create table public.comentarios (
  id uuid primary key default gen_random_uuid(),
  publicacion_id uuid not null references public.publicaciones (id) on delete cascade,
  espacio_id uuid not null references public.espacios (id) on delete cascade,
  autor_id uuid references auth.users (id) on delete set null default auth.uid(),
  tipo public.tipo_comentario not null default 'comentario',
  texto text not null default '' check (char_length(texto) <= 3000),
  creado_en timestamptz not null default now(),
  constraint comentario_con_texto check (tipo <> 'comentario' or char_length(btrim(texto)) > 0)
);
create index comentarios_publicacion_idx on public.comentarios (publicacion_id, creado_en);
create index comentarios_espacio_idx on public.comentarios (espacio_id);
create index comentarios_autor_idx on public.comentarios (autor_id);

-- Autor, fecha y espacio los pone la base de datos
create or replace function public.comentarios_coherencia()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  select p.espacio_id into new.espacio_id from public.publicaciones p where p.id = new.publicacion_id;
  if new.espacio_id is null then
    raise exception 'La publicación no existe.' using errcode = '23503';
  end if;
  new.autor_id := coalesce(auth.uid(), new.autor_id);
  new.creado_en := now();
  return new;
end;
$$;
revoke execute on function public.comentarios_coherencia() from public, anon, authenticated;
create trigger comentarios_coherencia before insert on public.comentarios
for each row execute function public.comentarios_coherencia();

alter table public.comentarios enable row level security;

create policy "miembros ven comentarios" on public.comentarios for select to authenticated
  using (privado.es_miembro(espacio_id));
-- Desde el navegador solo se crean comentarios simples; el historial lo escriben las funciones
create policy "administrador, editor o revisor comenta" on public.comentarios for insert to authenticated
  with check (tipo = 'comentario' and privado.tiene_rol(espacio_id, '{administrador,editor,revisor}'));
create policy "cada uno borra sus comentarios simples" on public.comentarios for delete to authenticated
  using (tipo = 'comentario' and autor_id = (select auth.uid()));

revoke all on public.comentarios from anon;
revoke update on public.comentarios from authenticated;

-- ---------------------------------------------------------------------------
-- Pedir revisión: borrador (o idea) -> en revisión
-- ---------------------------------------------------------------------------
create or replace function public.solicitar_revision(p_publicacion uuid, p_mensaje text default '')
returns public.estado_publicacion
language plpgsql security definer set search_path = ''
as $$
declare
  pub public.publicaciones%rowtype;
begin
  select * into pub from public.publicaciones where id = p_publicacion for update;
  if not found or not privado.es_miembro(pub.espacio_id) then
    raise exception 'La publicación no existe.' using errcode = 'P0001', hint = 'publicacion_no_existe';
  end if;
  if not privado.tiene_rol(pub.espacio_id, '{administrador,editor}') then
    raise exception 'Tu rol no permite pedir revisión.' using errcode = '42501';
  end if;
  if pub.estado not in ('idea', 'borrador') then
    raise exception 'Solo se pide revisión de ideas o borradores.' using errcode = 'P0001', hint = 'estado_no_permite_revision';
  end if;
  update public.publicaciones set estado = 'en_revision' where id = p_publicacion;
  insert into public.comentarios (publicacion_id, espacio_id, tipo, texto)
  values (p_publicacion, pub.espacio_id, 'solicitud', left(coalesce(btrim(p_mensaje), ''), 3000));
  return 'en_revision';
end;
$$;

-- ---------------------------------------------------------------------------
-- Revisar: en revisión -> aprobado | borrador (devuelta, con motivo obligatorio)
-- ---------------------------------------------------------------------------
create or replace function public.revisar_publicacion(p_publicacion uuid, p_aprobar boolean, p_mensaje text default '')
returns public.estado_publicacion
language plpgsql security definer set search_path = ''
as $$
declare
  pub public.publicaciones%rowtype;
  nuevo public.estado_publicacion;
begin
  select * into pub from public.publicaciones where id = p_publicacion for update;
  if not found or not privado.es_miembro(pub.espacio_id) then
    raise exception 'La publicación no existe.' using errcode = 'P0001', hint = 'publicacion_no_existe';
  end if;
  if not privado.tiene_rol(pub.espacio_id, '{administrador,editor,revisor}') then
    raise exception 'Tu rol no permite aprobar ni devolver.' using errcode = '42501';
  end if;
  if pub.estado <> 'en_revision' then
    raise exception 'Esta publicación ya no está en revisión.' using errcode = 'P0001', hint = 'no_en_revision';
  end if;
  if not p_aprobar and char_length(btrim(coalesce(p_mensaje, ''))) = 0 then
    raise exception 'Explica qué hay que cambiar.' using errcode = 'P0001', hint = 'devolucion_sin_motivo';
  end if;
  nuevo := case when p_aprobar then 'aprobado' else 'borrador' end;
  update public.publicaciones set estado = nuevo where id = p_publicacion;
  insert into public.comentarios (publicacion_id, espacio_id, tipo, texto)
  values (p_publicacion, pub.espacio_id, case when p_aprobar then 'aprobacion' else 'devolucion' end::public.tipo_comentario,
          left(coalesce(btrim(p_mensaje), ''), 3000));
  return nuevo;
end;
$$;

revoke execute on function public.solicitar_revision(uuid, text) from public, anon;
revoke execute on function public.revisar_publicacion(uuid, boolean, text) from public, anon;
grant execute on function public.solicitar_revision(uuid, text) to authenticated;
grant execute on function public.revisar_publicacion(uuid, boolean, text) to authenticated;
