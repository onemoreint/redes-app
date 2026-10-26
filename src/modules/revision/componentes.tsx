import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/datos/supabase'
import { exigir, mensajeError } from '../../lib/datos/errores'
import type { Comentario } from '../../lib/datos/tipos-bd'
import type { Estado } from '../../lib/calculos/publicaciones'
import { puede } from '../../lib/roles'
import { Areatexto, Aviso, Boton, Cargando, DialogoConfirmar, Tarjeta, useNotas } from '../../components/ui'
import { useEspacio } from '../../app/espacio'
import { useSesion } from '../../app/sesion'
import { nombreDe, useMiembros } from '../../app/miembros'
import { clavesRev, useAccionesRevision, useComentarios } from './datos'

const ETIQUETA_TIPO: Record<Comentario['tipo'], string> = {
  comentario: 'comentó',
  solicitud: 'pidió revisión',
  aprobacion: 'aprobó',
  devolucion: 'devolvió para cambios',
}
const ESTILO_TIPO: Record<Comentario['tipo'], string> = {
  comentario: 'border-stone-200 bg-white',
  solicitud: 'border-amber-200 bg-amber-50',
  aprobacion: 'border-emerald-200 bg-emerald-50',
  devolucion: 'border-red-200 bg-red-50',
}

const cuando = (iso: string, zona: string) =>
  new Date(iso).toLocaleString('es', { timeZone: zona, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Diálogo para aprobar, devolver o pedir revisión, con mensaje (obligatorio al devolver). */
export function DialogoRevision({
  accion,
  cargando,
  onCerrar,
  onConfirmar,
}: {
  accion: 'aprobar' | 'devolver' | 'solicitar' | null
  cargando: boolean
  onCerrar: () => void
  onConfirmar: (mensaje: string) => void
}) {
  const [mensaje, setMensaje] = useState('')
  const textos = {
    aprobar: { titulo: '¿Aprobar esta publicación?', boton: 'Aprobar', etiqueta: 'Comentario (opcional)' },
    devolver: { titulo: 'Devolver para cambios', boton: 'Devolver', etiqueta: 'Qué hay que cambiar' },
    solicitar: { titulo: 'Pedir revisión', boton: 'Pedir revisión', etiqueta: 'Mensaje para quien revisa (opcional)' },
  }
  const t = accion ? textos[accion] : textos.aprobar
  const invalido = accion === 'devolver' && !mensaje.trim()
  return (
    <DialogoConfirmar
      abierto={accion !== null}
      titulo={t.titulo}
      textoConfirmar={t.boton}
      peligro={accion === 'devolver'}
      cargando={cargando}
      confirmarDeshabilitado={invalido}
      onCerrar={() => {
        setMensaje('')
        onCerrar()
      }}
      onConfirmar={() => {
        onConfirmar(mensaje.trim())
        setMensaje('')
      }}
    >
      <Areatexto etiqueta={t.etiqueta} rows={3} maxLength={3000} value={mensaje} onChange={(e) => setMensaje(e.target.value)} autoFocus />
      {accion === 'aprobar' && <p className="mt-2 text-xs text-stone-500">Pasará a «Aprobado» y quedará constancia de quién la aprobó.</p>}
      {accion === 'devolver' && <p className="mt-2 text-xs text-stone-500">Volverá a «Borrador» para que la corrijan.</p>}
    </DialogoConfirmar>
  )
}

/** Barra de acciones de revisión según el estado y el rol. */
export function AccionesRevision({ publicacion, estado, haySinGuardar }: { publicacion: string; estado: Estado; haySinGuardar: boolean }) {
  const { actual } = useEspacio()
  const { solicitar, revisar } = useAccionesRevision(actual!.id)
  const [accion, setAccion] = useState<'aprobar' | 'devolver' | 'solicitar' | null>(null)
  const puedePedir = puede.editar(actual?.rol) && (estado === 'idea' || estado === 'borrador')
  const puedeRevisar = puede.aprobar(actual?.rol) && estado === 'en_revision'
  if (!puedePedir && !puedeRevisar) return null

  return (
    <Tarjeta
      titulo="Revisión"
      descripcion={
        puedeRevisar
          ? 'Esta publicación espera revisión. Apruébala o devuélvela explicando qué cambiar.'
          : 'Cuando esté lista, pide que alguien la revise antes de publicarla.'
      }
    >
      {haySinGuardar && <div className="mb-3"><Aviso tipo="alerta">Guarda los cambios antes de enviarla a revisión o revisarla.</Aviso></div>}
      <div className="flex flex-wrap gap-2">
        {puedePedir && (
          <Boton disabled={haySinGuardar} onClick={() => setAccion('solicitar')}>
            Pedir revisión
          </Boton>
        )}
        {puedeRevisar && (
          <>
            <Boton disabled={haySinGuardar} onClick={() => setAccion('aprobar')}>
              Aprobar
            </Boton>
            <Boton variante="secundario" disabled={haySinGuardar} onClick={() => setAccion('devolver')}>
              Devolver para cambios
            </Boton>
          </>
        )}
      </div>
      <DialogoRevision
        accion={accion}
        cargando={solicitar.isPending || revisar.isPending}
        onCerrar={() => setAccion(null)}
        onConfirmar={(mensaje) => {
          const fin = { onSettled: () => setAccion(null) }
          if (accion === 'solicitar') solicitar.mutate({ pub: publicacion, mensaje }, fin)
          else revisar.mutate({ pub: publicacion, aprobar: accion === 'aprobar', mensaje }, fin)
        }}
      />
    </Tarjeta>
  )
}

/** Hilo de comentarios e historial de revisión de una publicación. */
export function HiloComentarios({ publicacion }: { publicacion: string }) {
  const { actual } = useEspacio()
  const { sesion } = useSesion()
  const zona = actual!.zona_horaria
  const comentarios = useComentarios(publicacion)
  const miembros = useMiembros(actual!.id)
  const qc = useQueryClient()
  const avisar = useNotas()
  const [texto, setTexto] = useState('')
  const puedeComentar = puede.aprobar(actual?.rol)

  const comentar = useMutation({
    mutationFn: async () =>
      exigir(
        await supabase.from('comentarios').insert({ publicacion_id: publicacion, espacio_id: actual!.id, texto: texto.trim() }).select(),
      ),
    onSuccess: () => {
      setTexto('')
      qc.invalidateQueries({ queryKey: clavesRev.comentarios(publicacion) })
    },
    onError: (e) => avisar(mensajeError(e), 'error'),
  })
  const borrar = useMutation({
    mutationFn: async (id: string) => {
      const r = exigir(await supabase.from('comentarios').delete().eq('id', id).select('id'))
      if (r.length === 0) throw { code: '42501' }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: clavesRev.comentarios(publicacion) }),
    onError: (e) => avisar(mensajeError(e), 'error'),
  })

  return (
    <Tarjeta titulo="Comentarios e historial" descripcion="Quién pidió revisión, quién aprobó o devolvió, y las conversaciones sobre esta publicación.">
      {comentarios.isPending && <Cargando />}
      {comentarios.error && <Aviso tipo="error">{mensajeError(comentarios.error)}</Aviso>}
      {comentarios.data && comentarios.data.length === 0 && <p className="text-sm text-stone-500">Aún no hay comentarios.</p>}
      {comentarios.data && comentarios.data.length > 0 && (
        <ol className="space-y-2">
          {comentarios.data.map((c) => {
            const autor = miembros.data?.find((m) => m.usuario_id === c.autor_id)
            return (
              <li key={c.id} className={'rounded-lg border px-3 py-2 ' + ESTILO_TIPO[c.tipo]}>
                <p className="text-xs text-stone-600">
                  <span className="font-medium text-stone-800">{c.autor_id ? (autor ? nombreDe(autor) : 'Ex miembro') : 'Cuenta borrada'}</span>{' '}
                  {ETIQUETA_TIPO[c.tipo]} · {cuando(c.creado_en, zona)}
                </p>
                {c.texto && <p className="mt-1 whitespace-pre-wrap text-sm">{c.texto}</p>}
                {c.tipo === 'comentario' && c.autor_id === sesion?.user.id && (
                  <button
                    type="button"
                    className="mt-1 text-xs text-red-700 hover:underline disabled:opacity-50"
                    disabled={borrar.isPending}
                    onClick={() => borrar.mutate(c.id)}
                  >
                    Borrar mi comentario
                  </button>
                )}
              </li>
            )
          })}
        </ol>
      )}
      {puedeComentar && (
        <div className="mt-4 space-y-2">
          <Areatexto
            etiqueta="Nuevo comentario"
            rows={2}
            maxLength={3000}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && texto.trim()) {
                e.preventDefault()
                comentar.mutate()
              }
            }}
            ayuda="Ctrl + Enter para enviar."
          />
          <Boton variante="secundario" cargando={comentar.isPending} disabled={!texto.trim()} onClick={() => comentar.mutate()}>
            Comentar
          </Boton>
        </div>
      )}
    </Tarjeta>
  )
}
