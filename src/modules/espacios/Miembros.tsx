import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase, urlApp } from '../../lib/datos/supabase'
import { exigir, mensajeError } from '../../lib/datos/errores'
import type { Invitacion, Rol } from '../../lib/datos/tipos-bd'
import { useMiembros, type FilaMiembro } from '../../app/miembros'
import { DESCRIPCION_ROL, NOMBRE_ROL, ROLES, puede } from '../../lib/roles'
import { Aviso, Boton, Campo, Cargando, DialogoConfirmar, Encabezado, Selector, Tarjeta, useNotas } from '../../components/ui'
import { claveEspacios, useEspacio } from '../../app/espacio'
import { useSesion } from '../../app/sesion'


const fecha = (iso: string) => new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })

export function enlaceInvitacion(token: string) {
  return urlApp(`invitacion/${token}`)
}

export default function Miembros() {
  const { actual } = useEspacio()
  const { sesion } = useSesion()
  const qc = useQueryClient()
  const avisar = useNotas()
  const navegar = useNavigate()
  const yo = sesion!.user.id
  const esAdmin = puede.administrarEspacio(actual?.rol)
  const espacioId = actual!.id

  const miembros = useMiembros(espacioId)

  const cambiarRol = useMutation({
    mutationFn: async ({ usuario, rol }: { usuario: string; rol: Rol }) => {
      exigir(await supabase.from('miembros').update({ rol }).eq('espacio_id', espacioId).eq('usuario_id', usuario).select())
    },
    onSuccess: () => {
      avisar('Rol actualizado.')
      qc.invalidateQueries({ queryKey: ['miembros', espacioId] })
      qc.invalidateQueries({ queryKey: claveEspacios(yo) })
    },
    onError: (e) => {
      avisar(mensajeError(e), 'error')
      qc.invalidateQueries({ queryKey: ['miembros', espacioId] })
    },
  })

  const [aQuitar, setAQuitar] = useState<FilaMiembro | null>(null)
  const quitar = useMutation({
    mutationFn: async (usuario: string) => {
      const r = exigir(await supabase.from('miembros').delete().eq('espacio_id', espacioId).eq('usuario_id', usuario).select())
      if (r.length === 0) throw { code: '42501' }
    },
    onSuccess: (_d, usuario) => {
      setAQuitar(null)
      if (usuario === yo) {
        avisar('Saliste del espacio.')
        qc.invalidateQueries({ queryKey: claveEspacios(yo) })
        navegar('/')
      } else {
        avisar('Miembro quitado del espacio.')
        qc.invalidateQueries({ queryKey: ['miembros', espacioId] })
      }
    },
    onError: (e) => avisar(mensajeError(e), 'error'),
  })

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Miembros"
        descripcion={
          esAdmin
            ? 'Personas con acceso a este espacio y lo que puede hacer cada una.'
            : 'Personas con acceso a este espacio. Solo un administrador puede invitar o cambiar roles.'
        }
      />

      <Tarjeta>
        {miembros.isPending && <Cargando />}
        {miembros.error && <Aviso tipo="error">{mensajeError(miembros.error)}</Aviso>}
        {miembros.data && (
          <ul className="divide-y divide-stone-100">
            {miembros.data.map((m) => {
              const soyYo = m.usuario_id === yo
              const nombre = m.perfil?.nombre || m.perfil?.email || 'Sin nombre'
              return (
                <li key={m.usuario_id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span
                    aria-hidden
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-marca-100 text-sm font-semibold text-marca-800"
                  >
                    {nombre.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {nombre} {soyYo && <span className="font-normal text-stone-500">(tú)</span>}
                    </p>
                    <p className="truncate text-xs text-stone-500">
                      {m.perfil?.email} · desde {fecha(m.creado_en)}
                    </p>
                  </div>
                  {esAdmin ? (
                    <Selector
                      etiqueta={`Rol de ${nombre}`}
                      ocultarEtiqueta
                      className="w-40"
                      value={m.rol}
                      disabled={cambiarRol.isPending}
                      onChange={(e) => cambiarRol.mutate({ usuario: m.usuario_id, rol: e.target.value as Rol })}
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {NOMBRE_ROL[r]}
                        </option>
                      ))}
                    </Selector>
                  ) : (
                    <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">{NOMBRE_ROL[m.rol]}</span>
                  )}
                  {(esAdmin || soyYo) && (
                    <Boton variante="fantasma" className="text-red-700 hover:bg-red-50" onClick={() => setAQuitar(m)}>
                      {soyYo ? 'Salir' : 'Quitar'}
                    </Boton>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Tarjeta>

      {esAdmin && <Invitaciones espacioId={espacioId} espacioNombre={actual!.nombre} />}

      <Tarjeta titulo="Qué puede hacer cada rol">
        <dl className="grid gap-3 sm:grid-cols-2">
          {ROLES.map((r) => (
            <div key={r} className="rounded-lg bg-stone-50 p-3">
              <dt className="text-sm font-medium">{NOMBRE_ROL[r]}</dt>
              <dd className="mt-1 text-xs text-stone-600">{DESCRIPCION_ROL[r]}</dd>
            </div>
          ))}
        </dl>
      </Tarjeta>

      <DialogoConfirmar
        abierto={aQuitar !== null}
        titulo={aQuitar?.usuario_id === yo ? '¿Salir de este espacio?' : '¿Quitar a esta persona?'}
        textoConfirmar={aQuitar?.usuario_id === yo ? 'Salir del espacio' : 'Quitar'}
        peligro
        cargando={quitar.isPending}
        onCerrar={() => setAQuitar(null)}
        onConfirmar={() => aQuitar && quitar.mutate(aQuitar.usuario_id)}
      >
        {aQuitar?.usuario_id === yo ? (
          <p>Dejarás de ver «{actual?.nombre}» y sus datos. Para volver, alguien tendrá que invitarte de nuevo.</p>
        ) : (
          <p>
            {aQuitar?.perfil?.nombre || aQuitar?.perfil?.email} dejará de tener acceso a «{actual?.nombre}». Lo que haya creado se
            conserva.
          </p>
        )}
      </DialogoConfirmar>
    </div>
  )
}

function Invitaciones({ espacioId, espacioNombre }: { espacioId: string; espacioNombre: string }) {
  const { sesion } = useSesion()
  const qc = useQueryClient()
  const avisar = useNotas()
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState<Rol>('editor')
  const [recien, setRecien] = useState<Invitacion | null>(null)
  const [aCancelar, setACancelar] = useState<Invitacion | null>(null)

  const pendientes = useQuery({
    queryKey: ['invitaciones', espacioId],
    queryFn: async () =>
      exigir(
        await supabase
          .from('invitaciones')
          .select('*')
          .eq('espacio_id', espacioId)
          .is('aceptada_en', null)
          .order('creada_en', { ascending: false }),
      ),
  })

  const crear = useMutation({
    mutationFn: async () =>
      exigir(
        await supabase
          .from('invitaciones')
          .insert({ espacio_id: espacioId, email: email.trim().toLowerCase(), rol, creada_por: sesion!.user.id })
          .select()
          .single(),
      ),
    onSuccess: (inv) => {
      setRecien(inv)
      setEmail('')
      qc.invalidateQueries({ queryKey: ['invitaciones', espacioId] })
    },
    onError: (e) => {
      const err = e as { code?: string }
      avisar(
        err.code === '23505' ? 'Ya hay una invitación pendiente para ese correo. Cópiala de la lista o cancélala.' : mensajeError(e),
        'error',
      )
    },
  })

  const cancelar = useMutation({
    mutationFn: async (id: string) => {
      exigir(await supabase.from('invitaciones').delete().eq('id', id).select())
    },
    onSuccess: () => {
      setACancelar(null)
      setRecien(null)
      avisar('Invitación cancelada. El enlace ya no funciona.')
      qc.invalidateQueries({ queryKey: ['invitaciones', espacioId] })
    },
    onError: (e) => avisar(mensajeError(e), 'error'),
  })

  async function copiar(inv: Invitacion) {
    try {
      await navigator.clipboard.writeText(enlaceInvitacion(inv.token))
      avisar('Enlace copiado.')
    } catch {
      avisar('No se pudo copiar. Selecciona el enlace y cópialo a mano.', 'error')
    }
  }

  const mensaje = (inv: Invitacion) =>
    `Hola, te invito a colaborar en «${espacioNombre}» en redes-app como ${NOMBRE_ROL[inv.rol].toLowerCase()}. ` +
    `Entra con este enlace (vence en 7 días) usando el correo ${inv.email}: ${enlaceInvitacion(inv.token)}`

  const emailValido = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (emailValido) crear.mutate()
  }

  return (
    <Tarjeta
      titulo="Invitar personas"
      descripcion="Se genera un enlace personal que compartes por WhatsApp o correo. Solo funciona con el correo invitado y vence en 7 días."
    >
      <form onSubmit={enviar} className="grid gap-3 sm:grid-cols-[1fr_11rem_auto] sm:items-end" noValidate>
        <Campo
          etiqueta="Correo de la persona"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={email && !emailValido ? 'Escribe un correo válido.' : null}
        />
        <Selector etiqueta="Rol" value={rol} onChange={(e) => setRol(e.target.value as Rol)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {NOMBRE_ROL[r]}
            </option>
          ))}
        </Selector>
        <Boton type="submit" cargando={crear.isPending} disabled={!emailValido}>
          Crear invitación
        </Boton>
      </form>
      <p className="mt-2 text-xs text-stone-500">{DESCRIPCION_ROL[rol]}</p>

      {recien && (
        <div className="mt-4">
          <Aviso tipo="exito">
            <p className="font-medium">Invitación lista para {recien.email}. Compártela:</p>
            <p className="mt-2 break-all rounded bg-white/70 px-2 py-1 font-mono text-xs">{enlaceInvitacion(recien.token)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Boton variante="secundario" onClick={() => copiar(recien)}>
                Copiar enlace
              </Boton>
              <a
                className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
                href={`https://wa.me/?text=${encodeURIComponent(mensaje(recien))}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Enviar por WhatsApp
              </a>
              <a
                className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
                href={`mailto:${recien.email}?subject=${encodeURIComponent(`Invitación a ${espacioNombre} en redes-app`)}&body=${encodeURIComponent(mensaje(recien))}`}
              >
                Enviar por correo
              </a>
            </div>
          </Aviso>
        </div>
      )}

      <h3 className="mt-6 text-sm font-semibold">Invitaciones pendientes</h3>
      {pendientes.isPending && <Cargando />}
      {pendientes.error && <Aviso tipo="error">{mensajeError(pendientes.error)}</Aviso>}
      {pendientes.data && pendientes.data.length === 0 && (
        <p className="mt-2 text-sm text-stone-500">No hay invitaciones pendientes.</p>
      )}
      {pendientes.data && pendientes.data.length > 0 && (
        <ul className="mt-2 divide-y divide-stone-100">
          {pendientes.data.map((inv) => {
            const vencida = new Date(inv.expira_en) < new Date()
            return (
              <li key={inv.id} className="flex flex-wrap items-center gap-2 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{inv.email}</p>
                  <p className={vencida ? 'text-xs text-red-700' : 'text-xs text-stone-500'}>
                    {NOMBRE_ROL[inv.rol]} · {vencida ? 'vencida el ' : 'vence el '}
                    {fecha(inv.expira_en)}
                  </p>
                </div>
                {!vencida && (
                  <Boton variante="fantasma" onClick={() => copiar(inv)}>
                    Copiar enlace
                  </Boton>
                )}
                <Boton variante="fantasma" className="text-red-700 hover:bg-red-50" onClick={() => setACancelar(inv)}>
                  {vencida ? 'Eliminar' : 'Cancelar'}
                </Boton>
              </li>
            )
          })}
        </ul>
      )}

      <DialogoConfirmar
        abierto={aCancelar !== null}
        titulo="¿Cancelar la invitación?"
        textoConfirmar="Cancelar invitación"
        peligro
        cargando={cancelar.isPending}
        onCerrar={() => setACancelar(null)}
        onConfirmar={() => aCancelar && cancelar.mutate(aCancelar.id)}
      >
        <p>El enlace enviado a {aCancelar?.email} dejará de funcionar. Podrás crear una nueva cuando quieras.</p>
      </DialogoConfirmar>
    </Tarjeta>
  )
}
