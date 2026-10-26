-- Endurecimiento tras revisar los avisos de seguridad de Supabase (entrega 1).
-- 1) Las funciones de permisos que usan las reglas RLS pasan a un esquema privado,
--    que la API REST no expone. Las políticas siguen funcionando porque referencian
--    la función por identificador, no por nombre.
-- 2) Las funciones de trigger no se pueden llamar por RPC.
-- 3) Índices para las claves foráneas de autoría.
-- Quedan expuestas a propósito (son la API de la app, con sus propias comprobaciones):
--   public.crear_espacio, public.ver_invitacion, public.aceptar_invitacion

create schema if not exists privado;
revoke all on schema privado from public, anon;
grant usage on schema privado to authenticated;

alter function public.rol_en_espacio(uuid) set schema privado;
alter function public.es_miembro(uuid) set schema privado;
alter function public.tiene_rol(uuid, public.rol_miembro[]) set schema privado;
alter function public.comparte_espacio_con(uuid) set schema privado;

-- tiene_rol llamaba a rol_en_espacio por nombre: actualizar su cuerpo
create or replace function privado.tiene_rol(p_espacio uuid, p_roles public.rol_miembro[])
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce(privado.rol_en_espacio(p_espacio) = any (p_roles), false); $$;

revoke execute on all functions in schema privado from public, anon;
grant execute on all functions in schema privado to authenticated;

revoke execute on function public.proteger_ultimo_administrador() from public, anon, authenticated;
revoke execute on function public.miembros_solo_rol() from public, anon, authenticated;
revoke execute on function public.marcar_actualizacion() from public, anon, authenticated;
revoke execute on function public.validar_zona_horaria() from public, anon, authenticated;

create index if not exists espacios_creado_por_idx on public.espacios (creado_por);
create index if not exists espacios_actualizado_por_idx on public.espacios (actualizado_por);
create index if not exists invitaciones_creada_por_idx on public.invitaciones (creada_por);
create index if not exists invitaciones_aceptada_por_idx on public.invitaciones (aceptada_por);
