import { useState } from 'react'
import { Link } from 'react-router-dom'
import { mensajeError } from '../../lib/datos/errores'
import { puede } from '../../lib/roles'
import { partesLocales } from '../../lib/calculos/calendario'
import { Aviso, Boton, Cargando, Encabezado, Tarjeta } from '../../components/ui'
import { useEspacio } from '../../app/espacio'
import { nombreDe, useMiembros } from '../../app/miembros'
import { useMarcas } from '../marcas/datos'
import { DialogoRevision } from './componentes'
import { useAccionesRevision, useDevueltas, usePendientes } from './datos'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export default function Revision() {
  const { actual } = useEspacio()
  const espacio = actual!.id
  const zona = actual!.zona_horaria
  const pendientes = usePendientes(espacio)
  const devueltas = useDevueltas(espacio)
  const marcas = useMarcas(espacio)
  const miembros = useMiembros(espacio)
  const { revisar } = useAccionesRevision(espacio)
  const puedeRevisar = puede.aprobar(actual?.rol)
  const [enCurso, setEnCurso] = useState<{ pub: string; accion: 'aprobar' | 'devolver' } | null>(null)

  const marca = (id: string) => marcas.data?.find((m) => m.id === id)
  const fecha = (iso: string | null) => {
    if (!iso) return 'Sin fecha'
    const { dia, hora } = partesLocales(iso, zona)
    const [, m, d] = dia.split('-').map(Number)
    return `${d} ${MESES[m - 1]} · ${hora}`
  }
  const autor = (id: string | null) => nombreDe(miembros.data?.find((m) => m.usuario_id === id))

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Revisión"
        descripcion={
          puedeRevisar
            ? 'Publicaciones que esperan tu aprobación. Apruébalas o devuélvelas explicando qué cambiar.'
            : 'Publicaciones en revisión. Tu rol puede verlas, pero no aprobarlas.'
        }
      />

      <Tarjeta titulo={`Pendientes de aprobar${pendientes.data ? ` (${pendientes.data.length})` : ''}`}>
        {pendientes.isPending && <Cargando />}
        {pendientes.error && <Aviso tipo="error">{mensajeError(pendientes.error)}</Aviso>}
        {pendientes.data && pendientes.data.length === 0 && (
          <p className="text-sm text-stone-500">No hay nada pendiente de revisión. Las publicaciones aparecen aquí cuando alguien pide revisión.</p>
        )}
        {pendientes.data && pendientes.data.length > 0 && (
          <ul className="divide-y divide-stone-100">
            {pendientes.data.map((p) => {
              const m = marca(p.marca_id)
              return (
                <li key={p.id} className="flex flex-wrap items-start gap-3 py-3">
                  <span aria-hidden className="mt-1.5 size-3 shrink-0 rounded-full" style={{ backgroundColor: m?.color }} />
                  <div className="min-w-0 flex-1">
                    <Link to={`/publicaciones/${p.id}`} className="font-medium text-marca-800 hover:underline">
                      {p.titulo}
                    </Link>
                    <p className="text-xs text-stone-600">
                      {m?.nombre} · {fecha(p.fecha_prevista)}
                      {p.solicitud && ` · pedida por ${autor(p.solicitud.autor_id)}`}
                    </p>
                    {p.solicitud?.texto && <p className="mt-1 text-sm italic text-stone-700">«{p.solicitud.texto}»</p>}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/publicaciones/${p.id}`}
                      className="inline-flex min-h-10 items-center rounded-lg px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
                    >
                      Ver
                    </Link>
                    {puedeRevisar && (
                      <>
                        <Boton onClick={() => setEnCurso({ pub: p.id, accion: 'aprobar' })}>Aprobar</Boton>
                        <Boton variante="secundario" onClick={() => setEnCurso({ pub: p.id, accion: 'devolver' })}>
                          Devolver
                        </Boton>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta titulo="Devueltas para cambios" descripcion="Borradores cuya última revisión pidió cambios.">
        {devueltas.isPending && <Cargando />}
        {devueltas.error && <Aviso tipo="error">{mensajeError(devueltas.error)}</Aviso>}
        {devueltas.data && devueltas.data.length === 0 && <p className="text-sm text-stone-500">Nada pendiente de corregir.</p>}
        {devueltas.data && devueltas.data.length > 0 && (
          <ul className="divide-y divide-stone-100">
            {devueltas.data.map((p) => (
              <li key={p.id} className="py-3">
                <Link to={`/publicaciones/${p.id}`} className="font-medium text-marca-800 hover:underline">
                  {p.titulo}
                </Link>
                <p className="text-xs text-stone-600">
                  {marca(p.marca_id)?.nombre} · devuelta por {autor(p.ultima!.autor_id)}
                </p>
                {p.ultima?.texto && <p className="mt-1 text-sm text-red-800">«{p.ultima.texto}»</p>}
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <DialogoRevision
        accion={enCurso?.accion ?? null}
        cargando={revisar.isPending}
        onCerrar={() => setEnCurso(null)}
        onConfirmar={(mensaje) =>
          enCurso && revisar.mutate({ pub: enCurso.pub, aprobar: enCurso.accion === 'aprobar', mensaje }, { onSettled: () => setEnCurso(null) })
        }
      />
    </div>
  )
}
