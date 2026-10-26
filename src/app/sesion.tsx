import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/datos/supabase'

type EstadoSesion = {
  sesion: Session | null
  cargando: boolean
  /** true cuando la persona llegó desde el enlace de "recuperar contraseña" */
  recuperando: boolean
  terminarRecuperacion: () => void
}

const Ctx = createContext<EstadoSesion>({ sesion: null, cargando: true, recuperando: false, terminarRecuperacion: () => {} })

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Session | null>(null)
  const [cargando, setCargando] = useState(true)
  const [recuperando, setRecuperando] = useState(false)

  useEffect(() => {
    let activo = true
    supabase.auth.getSession().then(({ data }) => {
      if (!activo) return
      setSesion(data.session)
      setCargando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      setSesion(s)
      setCargando(false)
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true)
    })
    return () => {
      activo = false
      data.subscription.unsubscribe()
    }
  }, [])

  return (
    <Ctx.Provider value={{ sesion, cargando, recuperando, terminarRecuperacion: () => setRecuperando(false) }}>
      {children}
    </Ctx.Provider>
  )
}

export const useSesion = () => useContext(Ctx)
