import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/datos/supabase'
import { exigir, exigirOpcional } from '../../lib/datos/errores'
import type { Publicacion, PublicacionCanal } from '../../lib/datos/tipos-bd'

export type PublicacionConCanales = Publicacion & { canales: string[] }

export const clavesPub = {
  todas: (espacio: string) => ['publicaciones', espacio] as const,
  rango: (espacio: string, desde: string, hasta: string) => ['publicaciones', espacio, 'rango', desde, hasta] as const,
  sinFecha: (espacio: string) => ['publicaciones', espacio, 'sin-fecha'] as const,
  una: (id: string) => ['publicacion', id] as const,
}

type FilaConCanales = Publicacion & { publicacion_canales: { canal: string }[] }
const aplanar = (filas: FilaConCanales[]): PublicacionConCanales[] =>
  filas.map(({ publicacion_canales, ...p }) => ({ ...p, canales: publicacion_canales.map((c) => c.canal) }))

/** Publicaciones con fecha dentro de [desde, hasta) (instantes UTC). */
export function usePublicacionesRango(espacio: string, desde: string, hasta: string) {
  return useQuery({
    queryKey: clavesPub.rango(espacio, desde, hasta),
    queryFn: async () =>
      aplanar(
        exigir(
          await supabase
            .from('publicaciones')
            .select('*, publicacion_canales(canal)')
            .eq('espacio_id', espacio)
            .gte('fecha_prevista', desde)
            .lt('fecha_prevista', hasta)
            .order('fecha_prevista'),
        ) as unknown as FilaConCanales[],
      ),
  })
}

/** Banco de ideas: publicaciones sin fecha que no están descartadas. */
export function usePublicacionesSinFecha(espacio: string) {
  return useQuery({
    queryKey: clavesPub.sinFecha(espacio),
    queryFn: async () =>
      aplanar(
        exigir(
          await supabase
            .from('publicaciones')
            .select('*, publicacion_canales(canal)')
            .eq('espacio_id', espacio)
            .is('fecha_prevista', null)
            .neq('estado', 'descartado')
            .order('creado_en', { ascending: false }),
        ) as unknown as FilaConCanales[],
      ),
  })
}

export function usePublicacion(id: string | undefined) {
  return useQuery({
    queryKey: clavesPub.una(id ?? 'nueva'),
    enabled: Boolean(id),
    queryFn: async () => {
      const p = exigirOpcional(await supabase.from('publicaciones').select('*').eq('id', id!).maybeSingle())
      if (!p) return null
      const canales = exigir(await supabase.from('publicacion_canales').select('*').eq('publicacion_id', id!).order('canal'))
      return { publicacion: p, canales: canales as PublicacionCanal[] }
    },
  })
}

/** Categorías ya usadas en el espacio (para sugerirlas al escribir). */
export function useCategoriasUsadas(espacio: string) {
  return useQuery({
    queryKey: ['categorias', espacio],
    queryFn: async () => {
      const filas = exigir(await supabase.from('publicaciones').select('categoria').eq('espacio_id', espacio).neq('categoria', ''))
      return [...new Set(filas.map((f) => f.categoria))].sort((a, b) => a.localeCompare(b, 'es'))
    },
  })
}
