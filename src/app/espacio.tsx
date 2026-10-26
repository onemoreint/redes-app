import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/datos/supabase'
import { exigir } from '../lib/datos/errores'
import type { Espacio, Rol } from '../lib/datos/tipos-bd'
import { useSesion } from './sesion'

export type MiEspacio = Espacio & { rol: Rol }

type EstadoEspacio = {
  espacios: MiEspacio[]
  actual: MiEspacio | null
  cargando: boolean
  error: unknown
  elegir: (id: string) => void
}

const Ctx = createContext<EstadoEspacio>({ espacios: [], actual: null, cargando: true, error: null, elegir: () => {} })

const CLAVE = 'redes-app:espacio-actual'
const leer = () => {
  try {
    return localStorage.getItem(CLAVE)
  } catch {
    return null
  }
}
const guardar = (id: string) => {
  try {
    localStorage.setItem(CLAVE, id)
  } catch {
    /* sin almacenamiento: se elige el primero la próxima vez */
  }
}

export const claveEspacios = (usuario?: string) => ['espacios', usuario] as const

export function ProveedorEspacio({ children }: { children: ReactNode }) {
  const { sesion } = useSesion()
  const usuario = sesion?.user.id
  const [elegido, setElegido] = useState<string | null>(leer)

  const consulta = useQuery({
    queryKey: claveEspacios(usuario),
    enabled: Boolean(usuario),
    queryFn: async (): Promise<MiEspacio[]> => {
      const filas = exigir(
        await supabase
          .from('miembros')
          .select('rol, espacios(*)')
          .eq('usuario_id', usuario!)
          .order('creado_en', { ascending: true }),
      )
      return filas
        .filter((f) => f.espacios)
        .map((f) => ({ ...(f.espacios as unknown as Espacio), rol: f.rol }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    },
  })

  const espacios = useMemo(() => consulta.data ?? [], [consulta.data])
  const actual = espacios.find((e) => e.id === elegido) ?? espacios[0] ?? null

  useEffect(() => {
    if (actual && actual.id !== elegido) {
      setElegido(actual.id)
      guardar(actual.id)
    }
  }, [actual, elegido])

  const elegir = useCallback((id: string) => {
    setElegido(id)
    guardar(id)
  }, [])

  return (
    <Ctx.Provider value={{ espacios, actual, cargando: consulta.isPending && Boolean(usuario), error: consulta.error, elegir }}>
      {children}
    </Ctx.Provider>
  )
}

export const useEspacio = () => useContext(Ctx)
