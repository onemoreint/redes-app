import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/datos/supabase'
import { exigir, exigirOpcional } from '../../lib/datos/errores'

export const claves = {
  marcas: (espacio: string) => ['marcas', espacio] as const,
  marca: (id: string) => ['marca', id] as const,
  estrategia: (marca: string) => ['estrategia', marca] as const,
  objetivos: (marca: string) => ['objetivos', marca] as const,
  progresos: (espacio: string) => ['progresos-estrategia', espacio] as const,
}

export function useMarcas(espacio: string) {
  return useQuery({
    queryKey: claves.marcas(espacio),
    queryFn: async () => exigir(await supabase.from('marcas').select('*').eq('espacio_id', espacio).order('nombre')),
  })
}

export function useMarca(id: string) {
  return useQuery({
    queryKey: claves.marca(id),
    queryFn: async () => exigirOpcional(await supabase.from('marcas').select('*').eq('id', id).maybeSingle()),
  })
}

export function useEstrategia(marca: string) {
  return useQuery({
    queryKey: claves.estrategia(marca),
    queryFn: async () => exigirOpcional(await supabase.from('estrategias').select('*').eq('marca_id', marca).maybeSingle()),
  })
}

export function useObjetivos(marca: string) {
  return useQuery({
    queryKey: claves.objetivos(marca),
    queryFn: async () =>
      exigir(
        await supabase
          .from('objetivos')
          .select('*')
          .eq('marca_id', marca)
          .order('fecha_limite', { ascending: true, nullsFirst: false })
          .order('creado_en'),
      ),
  })
}

/** Estrategias y número de objetivos de todas las marcas del espacio (para el avance en la lista). */
export function useProgresos(espacio: string) {
  return useQuery({
    queryKey: claves.progresos(espacio),
    queryFn: async () => {
      const [estrategias, objetivos] = await Promise.all([
        supabase.from('estrategias').select('*').eq('espacio_id', espacio),
        supabase.from('objetivos').select('marca_id').eq('espacio_id', espacio),
      ])
      return { estrategias: exigir(estrategias), objetivos: exigir(objetivos) }
    },
  })
}

/** Hoy (YYYY-MM-DD) en la zona horaria del espacio. */
export function hoyEn(zona: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: zona, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}
