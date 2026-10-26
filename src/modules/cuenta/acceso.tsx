import { useState, type FormEvent, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, urlApp } from '../../lib/datos/supabase'
import { mensajeError } from '../../lib/datos/errores'
import { Aviso, Boton, Campo } from '../../components/ui'
import { Firma } from '../../components/Firma'
import { useSesion } from '../../app/sesion'

/** Solo se aceptan rutas internas como destino tras entrar (evita redirecciones abiertas). */
export function destinoSeguro(valor: string | null): string {
  return valor && valor.startsWith('/') && !valor.startsWith('//') ? valor : '/'
}

export function PantallaAcceso({ titulo, descripcion, children }: { titulo: string; descripcion?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span aria-hidden className="grid size-10 place-items-center rounded-lg bg-marca-700 text-base font-bold text-white">
            r
          </span>
          <div>
            <p className="text-lg font-semibold leading-tight">redes-app</p>
            <p className="text-sm text-stone-500">Gestión de redes sociales</p>
          </div>
        </div>
        <main className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold">{titulo}</h1>
          {descripcion && <p className="mt-1 text-sm text-stone-600">{descripcion}</p>}
          <div className="mt-5">{children}</div>
        </main>
        <div className="mt-6 text-center">
          <Firma />
        </div>
      </div>
    </div>
  )
}

export function Entrar() {
  const { sesion } = useSesion()
  const [params] = useSearchParams()
  const destino = destinoSeguro(params.get('siguiente'))
  const navegar = useNavigate()
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (sesion) return <Navigate to={destino} replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: clave })
    setEnviando(false)
    if (error) setError(mensajeError(error))
    else navegar(destino, { replace: true })
  }

  const conDestino = (ruta: string) => (destino !== '/' ? `${ruta}?siguiente=${encodeURIComponent(destino)}` : ruta)

  return (
    <PantallaAcceso titulo="Entrar" descripcion="Usa el correo y la contraseña de tu cuenta.">
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Campo etiqueta="Correo" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Campo
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          required
          value={clave}
          onChange={(e) => setClave(e.target.value)}
        />
        <Boton type="submit" className="w-full" cargando={enviando} disabled={!email || !clave}>
          Entrar
        </Boton>
      </form>
      <div className="mt-5 space-y-2 text-sm">
        <p>
          <Link className="text-marca-700 hover:underline" to="/recuperar">
            Olvidé mi contraseña
          </Link>
        </p>
        <p className="text-stone-600">
          ¿No tienes cuenta?{' '}
          <Link className="font-medium text-marca-700 hover:underline" to={conDestino('/registro')}>
            Crear cuenta
          </Link>
        </p>
      </div>
    </PantallaAcceso>
  )
}

export function Registro() {
  const { sesion } = useSesion()
  const [params] = useSearchParams()
  const destino = destinoSeguro(params.get('siguiente'))
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [clave2, setClave2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  if (sesion) return <Navigate to={destino} replace />

  const errorClave = clave && clave.length < 8 ? 'Mínimo 8 caracteres.' : null
  const errorClave2 = clave2 && clave2 !== clave ? 'Las contraseñas no coinciden.' : null
  const valido = nombre.trim() && email.trim() && clave.length >= 8 && clave === clave2

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!valido) return
    setError(null)
    setEnviando(true)
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: clave,
      options: { data: { nombre: nombre.trim() }, emailRedirectTo: urlApp(destino) },
    })
    setEnviando(false)
    if (error) return setError(mensajeError(error))
    // Supabase no revela si el correo ya existía: devuelve un usuario sin identidades
    if (data.user && data.user.identities?.length === 0) {
      return setError(mensajeError({ code: 'user_already_exists' }))
    }
    if (!data.session) setEnviado(true)
  }

  if (enviado) {
    return (
      <PantallaAcceso titulo="Revisa tu correo">
        <Aviso tipo="exito">
          Te enviamos un enlace a <strong>{email}</strong>. Ábrelo para confirmar tu cuenta y entrar. Si no lo ves en unos minutos,
          revisa la carpeta de correo no deseado.
        </Aviso>
        <p className="mt-5 text-sm">
          <Link className="text-marca-700 hover:underline" to="/entrar">
            Volver a entrar
          </Link>
        </p>
      </PantallaAcceso>
    )
  }

  return (
    <PantallaAcceso titulo="Crear cuenta" descripcion="Gratis. Después podrás crear tu espacio de trabajo o unirte a uno.">
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Campo etiqueta="Tu nombre" autoComplete="name" required maxLength={120} value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Campo etiqueta="Correo" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Campo
          etiqueta="Contraseña"
          type="password"
          autoComplete="new-password"
          required
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          error={errorClave}
          ayuda="Mínimo 8 caracteres."
        />
        <Campo
          etiqueta="Repite la contraseña"
          type="password"
          autoComplete="new-password"
          required
          value={clave2}
          onChange={(e) => setClave2(e.target.value)}
          error={errorClave2}
        />
        <Boton type="submit" className="w-full" cargando={enviando} disabled={!valido}>
          Crear cuenta
        </Boton>
      </form>
      <p className="mt-5 text-sm text-stone-600">
        ¿Ya tienes cuenta?{' '}
        <Link
          className="font-medium text-marca-700 hover:underline"
          to={destino !== '/' ? `/entrar?siguiente=${encodeURIComponent(destino)}` : '/entrar'}
        >
          Entrar
        </Link>
      </p>
    </PantallaAcceso>
  )
}

export function Recuperar() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: urlApp('restablecer') })
    setEnviando(false)
    if (error) setError(mensajeError(error))
    else setEnviado(true)
  }

  return (
    <PantallaAcceso titulo="Recuperar contraseña" descripcion="Te enviaremos un enlace para crear una contraseña nueva.">
      {enviado ? (
        <Aviso tipo="exito">
          Si existe una cuenta con <strong>{email}</strong>, recibirás un enlace en unos minutos. Revisa también el correo no deseado.
        </Aviso>
      ) : (
        <form onSubmit={enviar} className="space-y-4" noValidate>
          {error && <Aviso tipo="error">{error}</Aviso>}
          <Campo etiqueta="Correo" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Boton type="submit" className="w-full" cargando={enviando} disabled={!email.trim()}>
            Enviar enlace
          </Boton>
        </form>
      )}
      <p className="mt-5 text-sm">
        <Link className="text-marca-700 hover:underline" to="/entrar">
          Volver a entrar
        </Link>
      </p>
    </PantallaAcceso>
  )
}

export function Restablecer() {
  const { sesion, cargando, terminarRecuperacion } = useSesion()
  const navegar = useNavigate()
  const [clave, setClave] = useState('')
  const [clave2, setClave2] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (cargando) return <PantallaAcceso titulo="Nueva contraseña">Comprobando el enlace…</PantallaAcceso>
  if (!sesion) {
    return (
      <PantallaAcceso titulo="Enlace no válido">
        <Aviso tipo="error">El enlace venció o ya se usó. Pide uno nuevo.</Aviso>
        <p className="mt-5 text-sm">
          <Link className="text-marca-700 hover:underline" to="/recuperar">
            Pedir otro enlace
          </Link>
        </p>
      </PantallaAcceso>
    )
  }

  const valido = clave.length >= 8 && clave === clave2

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!valido) return
    setError(null)
    setEnviando(true)
    const { error } = await supabase.auth.updateUser({ password: clave })
    setEnviando(false)
    if (error) return setError(mensajeError(error))
    terminarRecuperacion()
    navegar('/', { replace: true })
  }

  return (
    <PantallaAcceso titulo="Nueva contraseña" descripcion={`Para ${sesion.user.email}`}>
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {error && <Aviso tipo="error">{error}</Aviso>}
        <Campo
          etiqueta="Contraseña nueva"
          type="password"
          autoComplete="new-password"
          required
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          error={clave && clave.length < 8 ? 'Mínimo 8 caracteres.' : null}
          ayuda="Mínimo 8 caracteres."
        />
        <Campo
          etiqueta="Repite la contraseña"
          type="password"
          autoComplete="new-password"
          required
          value={clave2}
          onChange={(e) => setClave2(e.target.value)}
          error={clave2 && clave2 !== clave ? 'Las contraseñas no coinciden.' : null}
        />
        <Boton type="submit" className="w-full" cargando={enviando} disabled={!valido}>
          Guardar contraseña
        </Boton>
      </form>
    </PantallaAcceso>
  )
}
