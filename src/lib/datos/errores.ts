/**
 * Traduce los errores de Supabase (autenticación y base de datos) a mensajes
 * comprensibles en español. Nunca muestra detalles técnicos al usuario.
 */

const POR_CODIGO_AUTH: Record<string, string> = {
  invalid_credentials: 'El correo o la contraseña no son correctos.',
  email_not_confirmed: 'Aún no confirmas tu correo. Abre el enlace que te enviamos al registrarte.',
  user_already_exists: 'Ya existe una cuenta con ese correo. Prueba a entrar o a recuperar tu contraseña.',
  email_exists: 'Ya existe una cuenta con ese correo. Prueba a entrar o a recuperar tu contraseña.',
  weak_password: 'La contraseña es demasiado débil. Usa al menos 8 caracteres, combinando letras y números.',
  same_password: 'La nueva contraseña debe ser distinta de la actual.',
  over_email_send_rate_limit: 'Se enviaron demasiados correos en poco tiempo. Espera unos minutos y vuelve a intentarlo.',
  over_request_rate_limit: 'Demasiados intentos seguidos. Espera un momento y vuelve a intentarlo.',
  email_address_invalid: 'Ese correo no parece válido.',
  signup_disabled: 'El registro de cuentas nuevas está desactivado.',
  session_not_found: 'Tu sesión expiró. Vuelve a entrar.',
  flow_state_expired: 'El enlace ya venció. Pide uno nuevo.',
  otp_expired: 'El enlace ya venció. Pide uno nuevo.',
}

const POR_PISTA_BD: Record<string, string> = {
  ultimo_administrador: 'El espacio debe tener al menos un administrador. Nombra a otra persona administradora antes.',
  no_existe: 'La invitación no existe o fue cancelada.',
  usada: 'Esta invitación ya fue usada.',
  vencida: 'La invitación venció. Pide a quien te invitó que te envíe una nueva.',
  otro_correo: 'Esta invitación es para otro correo. Entra con la cuenta del correo invitado.',
  responsable_no_miembro: 'La persona responsable debe ser miembro de este espacio.',
  publicacion_no_existe: 'La publicación no existe o ya no tienes acceso.',
  estado_no_permite_revision: 'Solo se puede pedir revisión de ideas o borradores.',
  no_en_revision: 'Esta publicación ya no está en revisión: alguien la revisó antes. Recarga para ver su estado.',
  devolucion_sin_motivo: 'Para devolverla, explica qué hay que cambiar.',
  campana_otra_marca: 'La campaña elegida es de otra marca. Elige una campaña de la misma marca o ninguna.',
}

type ErrorConocido = { code?: string; message?: string; hint?: string; status?: number; name?: string }

export function mensajeError(e: unknown): string {
  if (!e) return 'Ocurrió un error inesperado.'
  const err = e as ErrorConocido
  if (err.hint && POR_PISTA_BD[err.hint]) return POR_PISTA_BD[err.hint]
  if (err.code && POR_CODIGO_AUTH[err.code]) return POR_CODIGO_AUTH[err.code]
  if (err.code === '23505') return 'Ya existe un registro igual. Revisa si está repetido.'
  if (err.code === '23514' || err.code === '22023') return 'Algún dato no es válido. Revísalo y vuelve a intentarlo.'
  if (err.code === '42501') return 'No tienes permiso para hacer esto.'
  if (err.name === 'AuthRetryableFetchError' || err.message === 'Failed to fetch' || err.message?.includes('NetworkError')) {
    return 'No hay conexión con el servidor. Revisa tu internet y vuelve a intentarlo.'
  }
  return 'No se pudo completar la acción. Vuelve a intentarlo; si sigue fallando, recarga la página.'
}

/** Lanza el error de Supabase si existe; si no, devuelve los datos (nunca null). */
export function exigir<T>(r: { data: T; error: unknown }): NonNullable<T> {
  if (r.error) throw r.error
  if (r.data == null) throw new Error('Respuesta vacía del servidor.')
  return r.data as NonNullable<T>
}

/** Como exigir, pero acepta que no haya resultado (consultas con maybeSingle). */
export function exigirOpcional<T>(r: { data: T; error: unknown }): T {
  if (r.error) throw r.error
  return r.data
}
