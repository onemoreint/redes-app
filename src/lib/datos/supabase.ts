import { createClient } from '@supabase/supabase-js'
import type { Database } from './tipos-bd'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const clave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const configuracionCompleta = Boolean(url && clave)

/** Cliente único de Supabase. Solo usa la clave publicable; nunca la de servicio. */
export const supabase = createClient<Database>(url ?? 'https://configuracion-faltante.invalid', clave ?? 'falta', {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
})

/** Dirección pública de la app (respeta el subdirectorio de GitHub Pages). */
export function urlApp(ruta = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${window.location.origin}${base}/${ruta.replace(/^\//, '')}`
}

export type EstadoConexion = { ok: true } | { ok: false; motivo: string }

/** Comprueba que el servicio de Supabase responde con esta configuración. */
export async function comprobarConexion(signal?: AbortSignal): Promise<EstadoConexion> {
  if (!configuracionCompleta) {
    return { ok: false, motivo: 'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY.' }
  }
  try {
    const r = await fetch(`${url}/auth/v1/health`, { headers: { apikey: clave! }, signal })
    return r.ok ? { ok: true } : { ok: false, motivo: `El servidor respondió con el código ${r.status}.` }
  } catch {
    return { ok: false, motivo: 'No hay conexión con el servidor. Revisa tu conexión a internet.' }
  }
}
