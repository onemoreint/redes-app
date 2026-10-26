import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/datos/supabase'
import { exigir, exigirOpcional, mensajeError } from '../../lib/datos/errores'
import { Aviso, Boton, Campo, Cargando, Encabezado, Tarjeta, useNotas } from '../../components/ui'
import { useSesion } from '../../app/sesion'

export const clavePerfil = (id?: string) => ['perfil', id] as const

export function usePerfil() {
  const { sesion } = useSesion()
  const id = sesion?.user.id
  return useQuery({
    queryKey: clavePerfil(id),
    enabled: Boolean(id),
    queryFn: async () => exigirOpcional(await supabase.from('perfiles').select('*').eq('id', id!).maybeSingle()),
  })
}

export default function MiCuenta() {
  const { sesion } = useSesion()
  const perfil = usePerfil()
  const qc = useQueryClient()
  const avisar = useNotas()
  const [nombre, setNombre] = useState('')
  const [clave, setClave] = useState('')
  const [clave2, setClave2] = useState('')

  useEffect(() => {
    if (perfil.data) setNombre(perfil.data.nombre)
  }, [perfil.data])

  const guardarNombre = useMutation({
    mutationFn: async () => {
      exigir(await supabase.from('perfiles').update({ nombre: nombre.trim() }).eq('id', sesion!.user.id).select())
    },
    onSuccess: () => {
      avisar('Nombre guardado.')
      qc.invalidateQueries({ queryKey: clavePerfil(sesion?.user.id) })
      qc.invalidateQueries({ queryKey: ['miembros'] })
    },
    onError: (e) => avisar(mensajeError(e), 'error'),
  })

  const cambiarClave = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({ password: clave })
      if (error) throw error
    },
    onSuccess: () => {
      setClave('')
      setClave2('')
      avisar('Contraseña cambiada.')
    },
    onError: (e) => avisar(mensajeError(e), 'error'),
  })

  const salir = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      qc.clear()
    },
    onError: (e) => avisar(mensajeError(e), 'error'),
  })

  const claveValida = clave.length >= 8 && clave === clave2

  return (
    <div className="space-y-6">
      <Encabezado titulo="Mi cuenta" descripcion={sesion?.user.email} />

      <Tarjeta titulo="Tu nombre" descripcion="Así te verán los demás miembros de tus espacios.">
        {perfil.isPending && <Cargando />}
        {perfil.error && <Aviso tipo="error">{mensajeError(perfil.error)}</Aviso>}
        {perfil.data && (
          <form
            className="flex max-w-md flex-wrap items-end gap-3"
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              if (nombre.trim()) guardarNombre.mutate()
            }}
          >
            <Campo className="min-w-56 flex-1" etiqueta="Nombre" maxLength={120} value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <Boton type="submit" cargando={guardarNombre.isPending} disabled={!nombre.trim() || nombre.trim() === perfil.data.nombre}>
              Guardar
            </Boton>
          </form>
        )}
      </Tarjeta>

      <Tarjeta titulo="Cambiar contraseña">
        <form
          className="max-w-md space-y-4"
          noValidate
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            if (claveValida) cambiarClave.mutate()
          }}
        >
          <Campo
            etiqueta="Contraseña nueva"
            type="password"
            autoComplete="new-password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            error={clave && clave.length < 8 ? 'Mínimo 8 caracteres.' : null}
          />
          <Campo
            etiqueta="Repite la contraseña"
            type="password"
            autoComplete="new-password"
            value={clave2}
            onChange={(e) => setClave2(e.target.value)}
            error={clave2 && clave2 !== clave ? 'Las contraseñas no coinciden.' : null}
          />
          <Boton type="submit" cargando={cambiarClave.isPending} disabled={!claveValida}>
            Cambiar contraseña
          </Boton>
        </form>
      </Tarjeta>

      <Tarjeta titulo="Sesión">
        <Boton variante="secundario" cargando={salir.isPending} onClick={() => salir.mutate()}>
          Cerrar sesión
        </Boton>
      </Tarjeta>
    </div>
  )
}
