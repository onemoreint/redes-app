import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/datos/supabase'
import { exigir, mensajeError } from '../../lib/datos/errores'
import { useNotas } from '../../components/ui'
import { clavesPub } from '../publicaciones/datos'

export const clavesRev = {
  comentarios: (pub: string) => ['comentarios', pub] as const,
  pendientes: (espacio: string) => ['publicaciones', espacio, 'en-revision'] as const,
  devueltas: (espacio: string) => ['publicaciones', espacio, 'devueltas'] as const,
}

export function useComentarios(publicacion: string) {
  return useQuery({
    queryKey: clavesRev.comentarios(publicacion),
    queryFn: async () => exigir(await supabase.from('comentarios').select('*').eq('publicacion_id', publicacion).order('creado_en')),
  })
}

/** Publicaciones en revisión del espacio, con el mensaje de la última solicitud. */
export function usePendientes(espacio: string) {
  return useQuery({
    queryKey: clavesRev.pendientes(espacio),
    enabled: Boolean(espacio),
    queryFn: async () => {
      const pubs = exigir(
        await supabase
          .from('publicaciones')
          .select('*')
          .eq('espacio_id', espacio)
          .eq('estado', 'en_revision')
          .order('fecha_prevista', { ascending: true, nullsFirst: false }),
      )
      const ids = pubs.map((p) => p.id)
      const solicitudes = ids.length
        ? exigir(
            await supabase
              .from('comentarios')
              .select('*')
              .in('publicacion_id', ids)
              .eq('tipo', 'solicitud')
              .order('creado_en', { ascending: false }),
          )
        : []
      return pubs.map((p) => ({ ...p, solicitud: solicitudes.find((s) => s.publicacion_id === p.id) ?? null }))
    },
  })
}

/** Borradores cuya última acción de revisión fue una devolución (para quien debe corregir). */
export function useDevueltas(espacio: string) {
  return useQuery({
    queryKey: clavesRev.devueltas(espacio),
    queryFn: async () => {
      const borradores = exigir(await supabase.from('publicaciones').select('*').eq('espacio_id', espacio).eq('estado', 'borrador'))
      const ids = borradores.map((p) => p.id)
      if (!ids.length) return []
      const historial = exigir(
        await supabase
          .from('comentarios')
          .select('*')
          .in('publicacion_id', ids)
          .neq('tipo', 'comentario')
          .order('creado_en', { ascending: false }),
      )
      return borradores
        .map((p) => ({ ...p, ultima: historial.find((h) => h.publicacion_id === p.id) ?? null }))
        .filter((p) => p.ultima?.tipo === 'devolucion')
    },
  })
}

/** Pedir revisión, aprobar y devolver: invalidan todo lo que depende del estado. */
export function useAccionesRevision(espacio: string) {
  const qc = useQueryClient()
  const avisar = useNotas()
  const refrescar = (pub: string) => {
    qc.invalidateQueries({ queryKey: clavesPub.todas(espacio) })
    qc.invalidateQueries({ queryKey: clavesPub.una(pub) })
    qc.invalidateQueries({ queryKey: clavesRev.comentarios(pub) })
  }
  const solicitar = useMutation({
    mutationFn: async ({ pub, mensaje }: { pub: string; mensaje: string }) =>
      exigir(await supabase.rpc('solicitar_revision', { p_publicacion: pub, p_mensaje: mensaje })),
    onSuccess: (_d, { pub }) => {
      avisar('Revisión pedida. Aparecerá en la bandeja de revisión.')
      refrescar(pub)
    },
    onError: (e, { pub }) => {
      avisar(mensajeError(e), 'error')
      refrescar(pub)
    },
  })
  const revisar = useMutation({
    mutationFn: async ({ pub, aprobar, mensaje }: { pub: string; aprobar: boolean; mensaje: string }) =>
      exigir(await supabase.rpc('revisar_publicacion', { p_publicacion: pub, p_aprobar: aprobar, p_mensaje: mensaje })),
    onSuccess: (_d, { pub, aprobar }) => {
      avisar(aprobar ? 'Publicación aprobada.' : 'Publicación devuelta con tus comentarios.')
      refrescar(pub)
    },
    onError: (e, { pub }) => {
      avisar(mensajeError(e), 'error')
      refrescar(pub)
    },
  })
  return { solicitar, revisar }
}
