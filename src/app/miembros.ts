import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/datos/supabase'
import { exigir } from '../lib/datos/errores'
import type { Perfil, Rol } from '../lib/datos/tipos-bd'
import { ROLES } from '../lib/roles'

export type FilaMiembro = { usuario_id: string; rol: Rol; creado_en: string; perfil: Perfil | null }

export const claveMiembros = (espacio: string) => ['miembros', espacio] as const

/** Miembros del espacio con su perfil (nombre y correo), ordenados por rol y nombre. */
export function useMiembros(espacio: string) {
  return useQuery({
    queryKey: claveMiembros(espacio),
    queryFn: async (): Promise<FilaMiembro[]> => {
      const filas = exigir(await supabase.from('miembros').select('usuario_id, rol, creado_en').eq('espacio_id', espacio))
      const ids = filas.map((f) => f.usuario_id)
      const perfiles = ids.length ? exigir(await supabase.from('perfiles').select('*').in('id', ids)) : []
      return filas
        .map((f) => ({ ...f, perfil: perfiles.find((p) => p.id === f.usuario_id) ?? null }))
        .sort(
          (a, b) =>
            ROLES.indexOf(a.rol) - ROLES.indexOf(b.rol) || (a.perfil?.nombre ?? '').localeCompare(b.perfil?.nombre ?? '', 'es'),
        )
    },
  })
}

export const nombreDe = (m: FilaMiembro | undefined | null) => m?.perfil?.nombre || m?.perfil?.email || 'Sin nombre'
