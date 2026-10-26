import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/datos/supabase'
import { exigir, exigirOpcional, mensajeError } from '../../lib/datos/errores'
import type { Campana } from '../../lib/datos/tipos-bd'
import { puede } from '../../lib/roles'
import { ETAPAS, type Etapa } from '../../lib/calculos/publicaciones'
import { partesLocales } from '../../lib/calculos/calendario'
import { resumir } from '../../lib/calculos/informe'
import { Areatexto, Aviso, Boton, Campo, Cargando, DialogoConfirmar, Encabezado, Selector, Tarjeta, useNotas } from '../../components/ui'
import { useEspacio } from '../../app/espacio'
import { hoyEn, useMarcas } from '../marcas/datos'
import { COLOR_ESTADO, NOMBRE_ESTADO, NOMBRE_ETAPA } from '../publicaciones/catalogos'
import { useResultados } from '../metricas/Informes'

const num = new Intl.NumberFormat('es', { maximumFractionDigits: 1 })
const fechaCorta = (d: string | null) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : null

export const claveCampanas = (espacio: string) => ['campanas', espacio] as const

export function useCampanas(espacio: string) {
  return useQuery({
    queryKey: claveCampanas(espacio),
    queryFn: async () => exigir(await supabase.from('campanas').select('*').eq('espacio_id', espacio).order('inicio', { ascending: false, nullsFirst: false })),
  })
}

function usePublicacionesDeCampanas(espacio: string) {
  return useQuery({
    queryKey: ['publicaciones', espacio, 'por-campana'],
    queryFn: async () =>
      exigir(
        await supabase
          .from('publicaciones')
          .select('id, titulo, estado, fecha_prevista, campana_id, marca_id')
          .eq('espacio_id', espacio)
          .not('campana_id', 'is', null)
          .order('fecha_prevista', { ascending: true, nullsFirst: false }),
      ),
  })
}

function estadoCampana(c: Campana, hoy: string): { texto: string; clase: string } {
  if (c.inicio && hoy < c.inicio) return { texto: 'Próxima', clase: 'bg-sky-50 text-sky-800' }
  if (c.fin && hoy > c.fin) return { texto: 'Terminada', clase: 'bg-stone-100 text-stone-600' }
  if (c.inicio || c.fin) return { texto: 'En curso', clase: 'bg-emerald-50 text-emerald-800' }
  return { texto: 'Sin fechas', clase: 'bg-stone-100 text-stone-600' }
}

export default function Campanas() {
  const { actual } = useEspacio()
  const espacio = actual!.id
  const hoy = hoyEn(actual!.zona_horaria)
  const editable = puede.editar(actual?.rol)
  const marcas = useMarcas(espacio)
  const campanas = useCampanas(espacio)
  const pubs = usePublicacionesDeCampanas(espacio)
  const [marca, setMarca] = useState('')
  const [creando, setCreando] = useState(false)
  const marcaPorId = useMemo(() => new Map((marcas.data ?? []).map((m) => [m.id, m])), [marcas.data])
  const lista = (campanas.data ?? []).filter((c) => !marca || c.marca_id === marca)

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Campañas"
        descripcion="Agrupa publicaciones de una marca con un tema y unas fechas (por ejemplo, el tema del mes de tu plan multicanal)."
        acciones={editable && !creando && (marcas.data?.length ?? 0) > 0 ? <Boton onClick={() => setCreando(true)}>Nueva campaña</Boton> : undefined}
      />
      {creando && <FormularioCampana campana={null} alCerrar={() => setCreando(false)} />}

      {(marcas.data?.length ?? 0) > 1 && (
        <Selector etiqueta="Marca" className="w-64" value={marca} onChange={(e) => setMarca(e.target.value)}>
          <option value="">Todas</option>
          {marcas.data!.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </Selector>
      )}

      {campanas.isPending && <Cargando />}
      {campanas.error && <Aviso tipo="error">{mensajeError(campanas.error)}</Aviso>}
      {campanas.data && lista.length === 0 && !creando && (
        <Tarjeta titulo="Aún no hay campañas">
          <p className="text-sm text-stone-600">
            {editable ? 'Crea una campaña y luego elígela en cada publicación que forme parte de ella.' : 'Cuando alguien cree campañas, aparecerán aquí.'}
          </p>
        </Tarjeta>
      )}
      {lista.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {lista.map((c) => {
            const m = marcaPorId.get(c.marca_id)
            const suyas = (pubs.data ?? []).filter((p) => p.campana_id === c.id)
            const publicadas = suyas.filter((p) => p.estado === 'publicado').length
            const est = estadoCampana(c, hoy)
            return (
              <li key={c.id}>
                <Link to={`/campanas/${c.id}`} className="block h-full rounded-xl border border-stone-200 bg-white p-4 hover:border-marca-600 hover:shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold">{c.nombre}</h2>
                    <span className={'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ' + est.clase}>{est.texto}</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-600">
                    <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: m?.color }} />
                    {m?.nombre}
                    {(c.inicio || c.fin) && ` · ${fechaCorta(c.inicio) ?? '…'} – ${fechaCorta(c.fin) ?? '…'}`}
                  </p>
                  {c.tema && <p className="mt-2 line-clamp-2 text-sm text-stone-700">{c.tema}</p>}
                  <p className="mt-3 text-xs text-stone-500">
                    {suyas.length} publicaciones · {publicadas} publicadas
                    {c.etapa && ` · ${NOMBRE_ETAPA[c.etapa]}`}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function FormularioCampana({ campana, alCerrar }: { campana: Campana | null; alCerrar: () => void }) {
  const { actual } = useEspacio()
  const espacio = actual!.id
  const marcas = useMarcas(espacio)
  const qc = useQueryClient()
  const avisar = useNotas()
  const navegar = useNavigate()
  const [f, setF] = useState({
    marca_id: campana?.marca_id ?? '',
    nombre: campana?.nombre ?? '',
    tema: campana?.tema ?? '',
    objetivo: campana?.objetivo ?? '',
    etapa: (campana?.etapa ?? '') as Etapa | '',
    inicio: campana?.inicio ?? '',
    fin: campana?.fin ?? '',
    notas: campana?.notas ?? '',
  })
  useEffect(() => {
    if (!f.marca_id && marcas.data?.length) setF((x) => ({ ...x, marca_id: marcas.data!.find((m) => !m.archivada)?.id ?? marcas.data![0].id }))
  }, [marcas.data, f.marca_id])
  const errFechas = f.inicio && f.fin && f.fin < f.inicio ? 'El fin no puede ser antes del inicio.' : null
  const valido = f.nombre.trim() && f.marca_id && !errFechas

  const guardar = useMutation({
    mutationFn: async () => {
      const datos = {
        nombre: f.nombre.trim(),
        tema: f.tema.trim(),
        objetivo: f.objetivo.trim(),
        etapa: f.etapa || null,
        inicio: f.inicio || null,
        fin: f.fin || null,
        notas: f.notas.trim(),
      }
      if (campana) {
        const r = exigir(await supabase.from('campanas').update(datos).eq('id', campana.id).select('id'))
        if (r.length === 0) throw { code: '42501' }
        return campana.id
      }
      return exigir(await supabase.from('campanas').insert({ ...datos, marca_id: f.marca_id, espacio_id: espacio }).select('id').single()).id
    },
    onSuccess: (id) => {
      avisar(campana ? 'Campaña actualizada.' : 'Campaña creada.')
      qc.invalidateQueries({ queryKey: claveCampanas(espacio) })
      qc.invalidateQueries({ queryKey: ['campana', id] })
      alCerrar()
      if (!campana) navegar(`/campanas/${id}`)
    },
    onError: (e) => avisar(mensajeError(e), 'error'),
  })

  return (
    <Tarjeta titulo={campana ? 'Editar campaña' : 'Nueva campaña'}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre" required maxLength={120} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} placeholder="Ej.: Lanzamiento de diciembre" />
        <Selector etiqueta="Marca" value={f.marca_id} disabled={Boolean(campana)} onChange={(e) => setF({ ...f, marca_id: e.target.value })} ayuda={campana ? 'La marca de una campaña no se cambia.' : undefined}>
          {(marcas.data ?? []).filter((m) => !m.archivada || m.id === f.marca_id).map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </Selector>
        <Campo etiqueta="Inicio" type="date" value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} />
        <Campo etiqueta="Fin" type="date" value={f.fin} onChange={(e) => setF({ ...f, fin: e.target.value })} error={errFechas} />
        <Areatexto className="sm:col-span-2" etiqueta="Tema" rows={2} maxLength={500} value={f.tema} onChange={(e) => setF({ ...f, tema: e.target.value })} />
        <Areatexto className="sm:col-span-2" etiqueta="Objetivo" rows={2} maxLength={1000} value={f.objetivo} onChange={(e) => setF({ ...f, objetivo: e.target.value })} placeholder="Qué quieres lograr con esta campaña" />
        <Selector etiqueta="Etapa del embudo" value={f.etapa} onChange={(e) => setF({ ...f, etapa: e.target.value as Etapa | '' })}>
          <option value="">Sin definir</option>
          {ETAPAS.map((e) => (
            <option key={e} value={e}>
              {NOMBRE_ETAPA[e]}
            </option>
          ))}
        </Selector>
        <Campo etiqueta="Notas" maxLength={3000} value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} />
      </div>
      <div className="mt-4 flex gap-2">
        <Boton cargando={guardar.isPending} disabled={!valido} onClick={() => guardar.mutate()}>
          {campana ? 'Guardar' : 'Crear campaña'}
        </Boton>
        <Boton variante="secundario" onClick={alCerrar}>
          Cancelar
        </Boton>
      </div>
    </Tarjeta>
  )
}

export function FichaCampana() {
  const { id = '' } = useParams()
  const { actual } = useEspacio()
  const espacio = actual!.id
  const zona = actual!.zona_horaria
  const editable = puede.editar(actual?.rol)
  const marcas = useMarcas(espacio)
  const resultados = useResultados(espacio)
  const qc = useQueryClient()
  const avisar = useNotas()
  const navegar = useNavigate()
  const [editando, setEditando] = useState(false)
  const [borrando, setBorrando] = useState(false)

  const campana = useQuery({
    queryKey: ['campana', id],
    queryFn: async () => exigirOpcional(await supabase.from('campanas').select('*').eq('id', id).maybeSingle()),
  })
  const pubs = useQuery({
    queryKey: ['publicaciones', espacio, 'campana', id],
    queryFn: async () =>
      exigir(await supabase.from('publicaciones').select('*').eq('campana_id', id).order('fecha_prevista', { ascending: true, nullsFirst: false })),
  })

  const borrar = useMutation({
    mutationFn: async () => {
      const r = exigir(await supabase.from('campanas').delete().eq('id', id).select('id'))
      if (r.length === 0) throw { code: '42501' }
    },
    onSuccess: () => {
      avisar('Campaña borrada. Sus publicaciones se conservan.')
      qc.invalidateQueries({ queryKey: claveCampanas(espacio) })
      qc.invalidateQueries({ queryKey: ['publicaciones', espacio] })
      navegar('/campanas', { replace: true })
    },
    onError: (e) => avisar(mensajeError(e), 'error'),
  })

  if (campana.isPending) return <Cargando />
  if (campana.error) return <Aviso tipo="error">{mensajeError(campana.error)}</Aviso>
  if (!campana.data || campana.data.espacio_id !== espacio)
    return (
      <div className="space-y-4">
        <Aviso tipo="error">Esta campaña no existe o es de otro espacio.</Aviso>
        <Link className="text-sm text-marca-700 hover:underline" to="/campanas">
          Volver a campañas
        </Link>
      </div>
    )
  const c = campana.data
  const m = marcas.data?.find((x) => x.id === c.marca_id)
  const ids = new Set((pubs.data ?? []).map((p) => p.id))
  const res = (resultados.data ?? []).filter((r) => ids.has(r.publicacion_id))
  const resumen = resumir(res, 0)
  const porEstado = (pubs.data ?? []).reduce<Record<string, number>>((acc, p) => ((acc[p.estado] = (acc[p.estado] ?? 0) + 1), acc), {})

  return (
    <div className="space-y-6">
      <div>
        <Link to="/campanas" className="text-sm text-marca-700 hover:underline">
          ← Campañas
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">{c.nombre}</h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-600">
          <span aria-hidden className="size-3 rounded-full" style={{ backgroundColor: m?.color }} />
          {m?.nombre}
          {(c.inicio || c.fin) && ` · ${fechaCorta(c.inicio) ?? '…'} – ${fechaCorta(c.fin) ?? '…'}`} · {estadoCampana(c, hoyEn(zona)).texto}
        </p>
      </div>

      {editando ? (
        <FormularioCampana campana={c} alCerrar={() => setEditando(false)} />
      ) : (
        <Tarjeta
          titulo="Detalles"
          acciones={
            editable ? (
              <div className="flex gap-2">
                <Boton variante="secundario" onClick={() => setEditando(true)}>
                  Editar
                </Boton>
                <Boton variante="fantasma" className="text-red-700 hover:bg-red-50" onClick={() => setBorrando(true)}>
                  Borrar
                </Boton>
              </div>
            ) : undefined
          }
        >
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-stone-500">Tema</dt>
              <dd>{c.tema || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500">Objetivo</dt>
              <dd>{c.objetivo || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500">Etapa del embudo</dt>
              <dd>{c.etapa ? NOMBRE_ETAPA[c.etapa] : '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500">Notas</dt>
              <dd className="whitespace-pre-wrap">{c.notas || '—'}</dd>
            </div>
          </dl>
        </Tarjeta>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato titulo="Publicaciones" valor={String(pubs.data?.length ?? '…')} />
        <Dato titulo="Publicadas" valor={String(porEstado.publicado ?? 0)} />
        <Dato titulo="Alcance (resultados)" valor={res.length ? num.format(resumen.totales.alcance) : '—'} />
        <Dato titulo="Compromiso (resultados)" valor={res.length ? num.format(resumen.compromiso) : '—'} />
      </div>

      <Tarjeta
        titulo="Publicaciones de la campaña"
        descripcion="Para añadir una, ábrela y elige esta campaña en «Planificación»."
        acciones={
          editable ? (
            <Link
              to={`/publicaciones/nueva?marca=${c.marca_id}&campana=${c.id}${c.inicio ? `&fecha=${c.inicio}` : ''}`}
              className="inline-flex min-h-10 items-center rounded-lg bg-marca-700 px-4 py-2 text-sm font-medium text-white hover:bg-marca-800"
            >
              Nueva publicación en la campaña
            </Link>
          ) : undefined
        }
      >
        {pubs.isPending && <Cargando />}
        {pubs.data && pubs.data.length === 0 && <p className="text-sm text-stone-500">Aún no hay publicaciones en esta campaña.</p>}
        {pubs.data && pubs.data.length > 0 && (
          <ul className="divide-y divide-stone-100">
            {pubs.data.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 py-2">
                <Link to={`/publicaciones/${p.id}`} className="min-w-0 flex-1 truncate text-sm font-medium text-marca-800 hover:underline">
                  {p.titulo}
                </Link>
                <span className="text-xs tabular-nums text-stone-500">
                  {p.fecha_prevista ? `${partesLocales(p.fecha_prevista, zona).dia} ${partesLocales(p.fecha_prevista, zona).hora}` : 'Sin fecha'}
                </span>
                <span className={'rounded-full border px-2 py-0.5 text-xs ' + COLOR_ESTADO[p.estado]}>{NOMBRE_ESTADO[p.estado]}</span>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>

      <DialogoConfirmar
        abierto={borrando}
        titulo="¿Borrar esta campaña?"
        textoConfirmar="Borrar campaña"
        peligro
        cargando={borrar.isPending}
        onCerrar={() => setBorrando(false)}
        onConfirmar={() => borrar.mutate()}
      >
        <p>Sus {pubs.data?.length ?? 0} publicaciones no se borran: solo quedan sin campaña.</p>
      </DialogoConfirmar>
    </div>
  )
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs text-stone-500">{titulo}</p>
      <p className="text-xl font-semibold tabular-nums">{valor}</p>
    </div>
  )
}
