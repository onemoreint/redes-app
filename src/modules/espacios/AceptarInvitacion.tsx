import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/datos/supabase'
import { exigir, mensajeError } from '../../lib/datos/errores'
import { DESCRIPCION_ROL, NOMBRE_ROL } from '../../lib/roles'
import { Aviso, Boton, Cargando } from '../../components/ui'
import { PantallaAcceso } from '../cuenta/acceso'
import { useSesion } from '../../app/sesion'
import { claveEspacios, useEspacio } from '../../app/espacio'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function AceptarInvitacion() {
  const { token = '' } = useParams()
  const { sesion, cargando } = useSesion()
  const { elegir } = useEspacio()
  const qc = useQueryClient()
  const navegar = useNavigate()
  const tokenValido = UUID.test(token)

  const datos = useQuery({
    queryKey: ['invitacion', token],
    enabled: Boolean(sesion) && tokenValido,
    queryFn: async () => exigir(await supabase.rpc('ver_invitacion', { p_token: token }))[0] ?? null,
  })

  const aceptar = useMutation({
    mutationFn: async () => exigir(await supabase.rpc('aceptar_invitacion', { p_token: token })),
    onSuccess: async (espacioId) => {
      await qc.invalidateQueries({ queryKey: claveEspacios(sesion?.user.id) })
      elegir(espacioId)
      navegar('/', { replace: true })
    },
  })

  if (cargando) return <PantallaAcceso titulo="Invitación"><Cargando /></PantallaAcceso>

  if (!tokenValido) {
    return (
      <PantallaAcceso titulo="Invitación no válida">
        <Aviso tipo="error">El enlace está incompleto. Pide a quien te invitó que te lo envíe de nuevo.</Aviso>
      </PantallaAcceso>
    )
  }

  if (!sesion) {
    const siguiente = encodeURIComponent(`/invitacion/${token}`)
    return (
      <PantallaAcceso titulo="Te invitaron a un espacio" descripcion="Entra o crea tu cuenta con el correo al que llegó la invitación.">
        <div className="flex flex-col gap-2">
          <Link
            to={`/registro?siguiente=${siguiente}`}
            className="inline-flex min-h-10 items-center justify-center rounded-lg bg-marca-700 px-4 py-2 text-sm font-medium text-white hover:bg-marca-800"
          >
            Crear cuenta
          </Link>
          <Link
            to={`/entrar?siguiente=${siguiente}`}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            Ya tengo cuenta
          </Link>
        </div>
      </PantallaAcceso>
    )
  }

  if (datos.isPending) return <PantallaAcceso titulo="Invitación"><Cargando /></PantallaAcceso>
  if (datos.error) return <PantallaAcceso titulo="Invitación"><Aviso tipo="error">{mensajeError(datos.error)}</Aviso></PantallaAcceso>

  const inv = datos.data
  if (!inv) {
    return (
      <PantallaAcceso titulo="Invitación no encontrada">
        <Aviso tipo="error">La invitación no existe o fue cancelada.</Aviso>
        <p className="mt-5 text-sm">
          <Link className="text-marca-700 hover:underline" to="/">
            Ir a mi inicio
          </Link>
        </p>
      </PantallaAcceso>
    )
  }
  if (inv.estado === 'aceptada') return <Navigate to="/" replace />

  const otroCorreo = inv.email.toLowerCase() !== (sesion.user.email ?? '').toLowerCase()

  return (
    <PantallaAcceso titulo={`Unirte a «${inv.espacio_nombre}»`}>
      <div className="space-y-4 text-sm">
        <p>
          Te invitaron como <strong>{NOMBRE_ROL[inv.rol]}</strong>. {DESCRIPCION_ROL[inv.rol]}
        </p>
        {inv.estado === 'vencida' && <Aviso tipo="error">Esta invitación venció. Pide a quien te invitó que te envíe una nueva.</Aviso>}
        {inv.estado === 'pendiente' && otroCorreo && (
          <Aviso tipo="alerta">
            La invitación es para <strong>{inv.email}</strong>, pero entraste como <strong>{sesion.user.email}</strong>. Cierra sesión y entra
            con el correo invitado.
          </Aviso>
        )}
        {aceptar.error && <Aviso tipo="error">{mensajeError(aceptar.error)}</Aviso>}
        <div className="flex flex-wrap gap-2">
          {inv.estado === 'pendiente' && !otroCorreo && (
            <Boton cargando={aceptar.isPending} onClick={() => aceptar.mutate()}>
              Aceptar y entrar
            </Boton>
          )}
          {otroCorreo && (
            <Boton
              variante="secundario"
              onClick={async () => {
                await supabase.auth.signOut()
                qc.clear()
              }}
            >
              Cerrar sesión
            </Boton>
          )}
        </div>
      </div>
    </PantallaAcceso>
  )
}
