-- Entrega 9: registro de cada importación desde Excel/CSV (quién, cuándo, qué archivo, cuántas filas).
-- Los archivos no se suben: se leen en el navegador y solo se envían las filas confirmadas.

create table public.importaciones (
  id uuid primary key default gen_random_uuid(),
  espacio_id uuid not null references public.espacios (id) on delete cascade,
  usuario_id uuid references auth.users (id) on delete set null default auth.uid(),
  archivo text not null check (char_length(archivo) <= 255),
  hoja text not null default '' check (char_length(hoja) <= 120),
  destino text not null check (destino in ('publicaciones', 'auditoria')),
  filas_importadas int not null check (filas_importadas >= 0),
  filas_rechazadas int not null check (filas_rechazadas >= 0),
  detalle jsonb not null default '[]'::jsonb check (jsonb_typeof(detalle) = 'array' and pg_column_size(detalle) < 200000),
  creado_en timestamptz not null default now()
);
create index importaciones_espacio_idx on public.importaciones (espacio_id, creado_en desc);
create index importaciones_usuario_idx on public.importaciones (usuario_id);

create or replace function public.importaciones_autoria()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.usuario_id := coalesce(auth.uid(), new.usuario_id);
  new.creado_en := now();
  return new;
end;
$$;
revoke execute on function public.importaciones_autoria() from public, anon, authenticated;
create trigger importaciones_autoria before insert on public.importaciones
for each row execute function public.importaciones_autoria();

alter table public.importaciones enable row level security;
create policy "miembros ven importaciones" on public.importaciones for select to authenticated using (privado.es_miembro(espacio_id));
create policy "editores registran importaciones" on public.importaciones for insert to authenticated
  with check (privado.tiene_rol(espacio_id, '{administrador,editor}'));
revoke all on public.importaciones from anon;
revoke update, delete on public.importaciones from authenticated;
