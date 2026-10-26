import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/datos/supabase'
import { exigir, mensajeError } from '../../lib/datos/errores'
import { NOMBRE_ROL, puede } from '../../lib/roles'
import { Aviso, Boton, Campo, DialogoConfirmar, Encabezado, Selector, Tarjeta, useNotas } from '../../components/ui'
import { claveEspacios, useEspacio } from '../../app/espacio'
import { useSesion } from '../../app/sesion'
import { zonasHorarias } from './zonas'
import { CopiaSeguridad } from './CopiaSeguridad'

export default function AjustesEspacio() {
  const { actual } = useEspacio()
  const { sesion } = useSesion()
  const qc = useQueryClient()
  const avisar = useNotas()
  const navegar = useNavigate()
  const esAdmin = puede.administrarEspacio(actual?.rol)
  const [nombre, setNombre] = useState(actual!.nombre)
  const [zona, setZona] = useState(actual!.zona_horaria)
  const [borrando, setBorrando] = useState(false)
  const [confirmacion, setConfirmacion] = useState('')

  useEffect(() => {
    setNombre(actual!.nombre)
    setZona(actual!.zona_horaria)
  }, [actual])

  const guardar = useMutation({
    mutationFn: async () => {
      const r = exigir(
        await supabase.from('espacios').update({ nombre: nombre.trim(), zona_horaria: zona }).eq('id', actual!.id).select(),
      )
      if (r.length === 0) throw { code: '42501' }
    },
    onSuccess: () => {
      avisar('Cambios guardados.')
      qc.invalidateQueries({ queryKey: claveEspacios(sesion?.user.id) })
    },
    onError: (e) => avisar(mensajeError(e), 'error'),
  })

  const borrar = useMutation({
    mutationFn: async () => {
      const r = exigir(await supabase.from('espacios').delete().eq('id', actual!.id).select())
      if (r.length === 0) throw { code: '42501' }
    },
    onSuccess: () => {
      setBorrando(false)
      avisar('Espacio borrado.')
      qc.invalidateQueries({ queryKey: claveEspacios(sesion?.user.id) })
      navegar('/')
    },
    onError: (e) => avisar(mensajeError(e), 'error'),
  })

  const cambios = nombre.trim() !== actual!.nombre || zona !== actual!.zona_horaria

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (nombre.trim() && cambios) guardar.mutate()
  }

  return (
    <div className="space-y-6">
      <Encabezado titulo="Ajustes del espacio" descripcion={`Tu rol aquí: ${NOMBRE_ROL[actual!.rol]}.`} />
      {!esAdmin && <Aviso>Solo un administrador puede cambiar estos ajustes.</Aviso>}

      <Tarjeta titulo="Datos generales">
        <form onSubmit={enviar} className="max-w-md space-y-4" noValidate>
          <Campo
            etiqueta="Nombre"
            required
            maxLength={80}
            disabled={!esAdmin}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            error={!nombre.trim() ? 'El nombre no puede quedar vacío.' : null}
          />
          <Selector
            etiqueta="Zona horaria"
            disabled={!esAdmin}
            value={zona}
            onChange={(e) => setZona(e.target.value)}
            ayuda="Se usa para el calendario, las fechas de publicación y las alertas de atraso."
          >
            {(zonasHorarias().includes(zona) ? zonasHorarias() : [zona, ...zonasHorarias()]).map((z) => (
              <option key={z} value={z}>
                {z.replaceAll('_', ' ')}
              </option>
            ))}
          </Selector>
          {esAdmin && (
            <Boton type="submit" cargando={guardar.isPending} disabled={!cambios || !nombre.trim()}>
              Guardar cambios
            </Boton>
          )}
        </form>
      </Tarjeta>

      {esAdmin && <CopiaSeguridad espacio={actual!} />}

      {esAdmin && (
        <Tarjeta titulo="Borrar el espacio" descripcion="Borra el espacio y todo lo que contiene para todos sus miembros. No se puede deshacer.">
          <Boton variante="peligro" onClick={() => setBorrando(true)}>
            Borrar espacio
          </Boton>
        </Tarjeta>
      )}

      <DialogoConfirmar
        abierto={borrando}
        titulo="¿Borrar este espacio para siempre?"
        textoConfirmar="Borrar para siempre"
        peligro
        cargando={borrar.isPending}
        confirmarDeshabilitado={confirmacion.trim() !== actual!.nombre}
        onCerrar={() => {
          setBorrando(false)
          setConfirmacion('')
        }}
        onConfirmar={() => borrar.mutate()}
      >
        <p>
          Se borrarán «{actual!.nombre}», sus miembros e invitaciones, y en las próximas versiones también sus marcas, publicaciones y
          métricas. Exporta antes lo que quieras conservar.
        </p>
        <Campo
          className="mt-4"
          etiqueta={`Escribe «${actual!.nombre}» para confirmar`}
          value={confirmacion}
          onChange={(e) => setConfirmacion(e.target.value)}
        />
      </DialogoConfirmar>
    </div>
  )
}
