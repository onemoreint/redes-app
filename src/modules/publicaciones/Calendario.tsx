import { useMemo, useState, type DragEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/datos/supabase'
import { exigir, mensajeError } from '../../lib/datos/errores'
import { puede } from '../../lib/roles'
import { CANALES } from '../../lib/canales'
import { ESTADOS, estaAtrasada, type Estado } from '../../lib/calculos/publicaciones'
import {
  agruparPorDia,
  aInstante,
  diasDeSemana,
  filtrar,
  moverADia,
  partesLocales,
  rangoUTC,
  semanasDelMes,
  sumarDias,
  type Dia,
  type Filtros,
} from '../../lib/calculos/calendario'
import { Aviso, Boton, Campo, Cargando, Encabezado, Selector, useNotas } from '../../components/ui'
import { useEspacio } from '../../app/espacio'
import { nombreDe, useMiembros } from '../../app/miembros'
import { hoyEn, useMarcas } from '../marcas/datos'
import { clavesPub, usePublicacionesRango, usePublicacionesSinFecha, type PublicacionConCanales } from './datos'
import { COLOR_ESTADO, NOMBRE_ESTADO } from './catalogos'
import { useCampanas } from '../campanas/Campanas'
import { exportarTabla } from '../../lib/exportar'

type Vista = 'mes' | 'semana' | 'lista'
const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const etiquetaDia = (d: Dia, conAnio = false) => {
  const [a, m, dd] = d.split('-').map(Number)
  return `${dd} de ${MESES[m - 1]}${conAnio ? ` de ${a}` : ''}`
}

export default function Calendario() {
  const { actual } = useEspacio()
  const espacio = actual!.id
  const zona = actual!.zona_horaria
  const editable = puede.editar(actual?.rol)
  const hoy = hoyEn(zona)
  const [params, setParams] = useSearchParams()
  const vista: Vista = (['mes', 'semana', 'lista'] as const).find((v) => v === params.get('vista')) ?? 'mes'
  const fecha: Dia = /^\d{4}-\d{2}-\d{2}$/.test(params.get('fecha') ?? '') ? params.get('fecha')! : hoy
  const [filtros, setFiltros] = useState<Filtros>({})
  const qc = useQueryClient()
  const avisar = useNotas()
  const navegar = useNavigate()

  const marcas = useMarcas(espacio)
  const miembros = useMiembros(espacio)
  const campanas = useCampanas(espacio)
  const [anio, mes] = fecha.split('-').map(Number)

  // Rango visible
  const dias: Dia[][] = vista === 'semana' ? [diasDeSemana(fecha)] : semanasDelMes(anio, mes)
  const desde = vista === 'lista' ? `${fecha.slice(0, 7)}-01` : dias[0][0]
  const hasta = vista === 'lista' ? sumarDias(`${anio + (mes === 12 ? 1 : 0)}-${String((mes % 12) + 1).padStart(2, '0')}-01`, -1) : dias.at(-1)!.at(-1)!
  const rango = rangoUTC(desde, hasta, zona)
  const pubs = usePublicacionesRango(espacio, rango.desde, rango.hasta)
  const sinFecha = usePublicacionesSinFecha(espacio)

  const ahora = useMemo(() => new Date(), [pubs.dataUpdatedAt]) // eslint-disable-line react-hooks/exhaustive-deps
  const visibles = useMemo(() => filtrar(pubs.data ?? [], filtros, ahora), [pubs.data, filtros, ahora])
  const ideas = useMemo(() => filtrar(sinFecha.data ?? [], filtros, ahora), [sinFecha.data, filtros, ahora])
  const porDia = useMemo(() => agruparPorDia(visibles, zona), [visibles, zona])
  const marcaPorId = useMemo(() => new Map((marcas.data ?? []).map((m) => [m.id, m])), [marcas.data])
  const categorias = useMemo(
    () => [...new Set([...(pubs.data ?? []), ...(sinFecha.data ?? [])].map((p) => p.categoria).filter(Boolean))].sort(),
    [pubs.data, sinFecha.data],
  )

  const mover = useMutation({
    mutationFn: async ({ pub, dia }: { pub: PublicacionConCanales; dia: Dia }) => {
      const nueva = pub.fecha_prevista ? moverADia(pub.fecha_prevista, dia, zona) : aInstante(dia, '09:00', zona)
      const cambio: { fecha_prevista: string; estado?: Estado } = { fecha_prevista: nueva }
      if (pub.estado === 'idea') cambio.estado = 'borrador'
      const r = exigir(await supabase.from('publicaciones').update(cambio).eq('id', pub.id).select())
      if (r.length === 0) throw { code: '42501' }
    },
    onSuccess: (_d, { dia }) => avisar(`Movida al ${etiquetaDia(dia)}.`),
    onError: (e) => avisar(mensajeError(e), 'error'),
    onSettled: () => qc.invalidateQueries({ queryKey: clavesPub.todas(espacio) }),
  })

  const irA = (nuevaFecha: Dia, nuevaVista: Vista = vista) => setParams({ vista: nuevaVista, fecha: nuevaFecha }, { replace: true })
  const paso = (dir: 1 | -1) => {
    if (vista === 'semana') return irA(sumarDias(fecha, 7 * dir))
    const m = mes + dir
    const a = anio + (m === 0 ? -1 : m === 13 ? 1 : 0)
    irA(`${a}-${String(((m + 11) % 12) + 1).padStart(2, '0')}-01`)
  }

  const titulo =
    vista === 'semana'
      ? `Semana del ${etiquetaDia(dias[0][0])} al ${etiquetaDia(dias[0][6], true)}`
      : `${MESES[mes - 1][0].toUpperCase()}${MESES[mes - 1].slice(1)} de ${anio}`

  const hayFiltros = Object.values(filtros).some(Boolean)
  const sinMarcas = marcas.data && marcas.data.length === 0

  // Arrastrar y soltar
  const [sobre, setSobre] = useState<Dia | null>(null)
  const todas = useMemo(() => [...(pubs.data ?? []), ...(sinFecha.data ?? [])], [pubs.data, sinFecha.data])
  const alSoltar = (e: DragEvent, dia: Dia) => {
    e.preventDefault()
    setSobre(null)
    const id = e.dataTransfer.getData('text/x-publicacion')
    const pub = todas.find((p) => p.id === id)
    if (pub && (!pub.fecha_prevista || partesLocales(pub.fecha_prevista, zona).dia !== dia)) mover.mutate({ pub, dia })
  }
  const propsSoltar = (dia: Dia) =>
    editable
      ? {
          onDragOver: (e: DragEvent) => {
            e.preventDefault()
            if (sobre !== dia) setSobre(dia)
          },
          onDragLeave: () => setSobre((s) => (s === dia ? null : s)),
          onDrop: (e: DragEvent) => alSoltar(e, dia),
        }
      : {}

  const Ficha = ({ p, compacta = false }: { p: PublicacionConCanales; compacta?: boolean }) => {
    const marca = marcaPorId.get(p.marca_id)
    const atrasada = estaAtrasada({ estado: p.estado, fechaPrevista: p.fecha_prevista }, ahora)
    const hora = p.fecha_prevista ? partesLocales(p.fecha_prevista, zona).hora : null
    return (
      <Link
        to={`/publicaciones/${p.id}`}
        draggable={editable}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/x-publicacion', p.id)
          e.dataTransfer.effectAllowed = 'move'
        }}
        title={`${p.titulo} · ${NOMBRE_ESTADO[p.estado]}${atrasada ? ' · atrasada' : ''}${marca ? ` · ${marca.nombre}` : ''}`}
        className={
          'block rounded-md border border-l-4 px-1.5 py-1 text-left hover:shadow-sm ' +
          COLOR_ESTADO[p.estado] +
          (atrasada ? ' ring-2 ring-red-500' : '') +
          (editable ? ' cursor-grab active:cursor-grabbing' : '')
        }
        style={{ borderLeftColor: marca?.color ?? '#a8a29e' }}
      >
        <span className={'block truncate font-medium ' + (compacta ? 'text-[11px]' : 'text-xs')}>
          {hora && <span className="mr-1 tabular-nums opacity-75">{hora}</span>}
          {p.titulo}
        </span>
        {!compacta && (
          <span className="block truncate text-[11px] opacity-80">
            {NOMBRE_ESTADO[p.estado]}
            {atrasada && ' · atrasada'}
            {p.canales.length > 0 && ` · ${p.canales.join(', ')}`}
          </span>
        )}
      </Link>
    )
  }

  function exportarVisibles() {
    const lista = [...visibles].sort((a, b) => (a.fecha_prevista ?? '').localeCompare(b.fecha_prevista ?? ''))
    const campanaPorId = new Map((campanas.data ?? []).map((c) => [c.id, c.nombre]))
    void exportarTabla(
      'xlsx',
      `calendario-${actual!.nombre.replace(/[^\p{L}\p{N}]+/gu, '-')}-${desde}-a-${hasta}`,
      ['Fecha', 'Hora', 'Marca', 'Título', 'Estado', 'Atrasada', 'Redes', 'Campaña', 'Categoría', 'Etapa', 'Formato', 'Texto', 'Hashtags', 'Llamado a la acción', 'Responsable', 'Notas'],
      lista.map((p) => {
        const local = p.fecha_prevista ? partesLocales(p.fecha_prevista, zona) : null
        return [
          local?.dia ?? '',
          local?.hora ?? '',
          marcaPorId.get(p.marca_id)?.nombre ?? '',
          p.titulo,
          NOMBRE_ESTADO[p.estado],
          estaAtrasada({ estado: p.estado, fechaPrevista: p.fecha_prevista }, ahora) ? 'Sí' : 'No',
          p.canales.join(', '),
          p.campana_id ? (campanaPorId.get(p.campana_id) ?? '') : '',
          p.categoria,
          p.etapa ?? '',
          p.tipos.join(', '),
          p.texto,
          p.hashtags,
          p.cta,
          p.responsable_id ? nombreDe(miembros.data?.find((m) => m.usuario_id === p.responsable_id)) : '',
          p.notas,
        ]
      }),
      'Calendario',
    )
  }

  return (
    <div className="space-y-5">
      <Encabezado
        titulo="Calendario editorial"
        descripcion="Planifica, mueve y sigue tus publicaciones. Arrastra una tarjeta a otro día para cambiar su fecha."
        acciones={
          <div className="flex flex-wrap gap-2">
            {visibles.length > 0 && (
              <Boton variante="secundario" onClick={exportarVisibles} title="Descarga las publicaciones del periodo visible, con los filtros aplicados">
                Descargar Excel
              </Boton>
            )}
            {editable && !sinMarcas && (
              <Boton onClick={() => navegar(`/publicaciones/nueva?fecha=${vista === 'mes' && fecha.slice(0, 7) !== hoy.slice(0, 7) ? fecha : hoy}`)}>
                Nueva publicación
              </Boton>
            )}
          </div>
        }
      />

      {sinMarcas && (
        <Aviso>
          Primero crea una marca: cada publicación pertenece a una.{' '}
          <Link className="font-medium underline" to="/marcas">
            Ir a marcas
          </Link>
        </Aviso>
      )}

      {/* Navegación y vista */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Boton variante="secundario" aria-label="Anterior" onClick={() => paso(-1)}>
            ‹
          </Boton>
          <Boton variante="secundario" onClick={() => irA(hoy)}>
            Hoy
          </Boton>
          <Boton variante="secundario" aria-label="Siguiente" onClick={() => paso(1)}>
            ›
          </Boton>
          <h2 className="ml-2 text-base font-semibold" aria-live="polite">
            {titulo}
          </h2>
        </div>
        <div role="group" aria-label="Vista" className="flex rounded-lg border border-stone-300 bg-white p-0.5 text-sm">
          {(['mes', 'semana', 'lista'] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={vista === v}
              onClick={() => irA(fecha, v)}
              className={'rounded-md px-3 py-1.5 capitalize ' + (vista === v ? 'bg-marca-700 text-white' : 'text-stone-700')}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="grid gap-3 rounded-xl border border-stone-200 bg-white p-3 sm:grid-cols-3 lg:grid-cols-6">
        <Selector etiqueta="Marca" value={filtros.marca ?? ''} onChange={(e) => setFiltros({ ...filtros, marca: e.target.value || undefined })}>
          <option value="">Todas</option>
          {(marcas.data ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
              {m.archivada ? ' (archivada)' : ''}
            </option>
          ))}
        </Selector>
        <Selector etiqueta="Red" value={filtros.canal ?? ''} onChange={(e) => setFiltros({ ...filtros, canal: e.target.value || undefined })}>
          <option value="">Todas</option>
          {CANALES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Selector>
        <Selector
          etiqueta="Estado"
          value={filtros.estado ?? ''}
          onChange={(e) => setFiltros({ ...filtros, estado: (e.target.value || undefined) as Filtros['estado'] })}
        >
          <option value="">Todos</option>
          <option value="activas">Sin publicar ni descartar</option>
          <option value="atrasadas">Atrasadas</option>
          {ESTADOS.map((s) => (
            <option key={s} value={s}>
              {NOMBRE_ESTADO[s]}
            </option>
          ))}
        </Selector>
        <Selector
          etiqueta="Responsable"
          value={filtros.responsable ?? ''}
          onChange={(e) => setFiltros({ ...filtros, responsable: e.target.value || undefined })}
        >
          <option value="">Todos</option>
          <option value="sin">Sin asignar</option>
          {(miembros.data ?? []).map((m) => (
            <option key={m.usuario_id} value={m.usuario_id}>
              {nombreDe(m)}
            </option>
          ))}
        </Selector>
        <Selector
          etiqueta="Categoría"
          value={filtros.categoria ?? ''}
          onChange={(e) => setFiltros({ ...filtros, categoria: e.target.value || undefined })}
        >
          <option value="">Todas</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Selector>
        {(campanas.data?.length ?? 0) > 0 && (
          <Selector
            etiqueta="Campaña"
            value={filtros.campana ?? ''}
            onChange={(e) => setFiltros({ ...filtros, campana: e.target.value || undefined })}
          >
            <option value="">Todas</option>
            <option value="sin">Sin campaña</option>
            {campanas.data!.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Selector>
        )}
        <Campo
          etiqueta="Buscar"
          type="search"
          placeholder="Título o texto"
          value={filtros.texto ?? ''}
          onChange={(e) => setFiltros({ ...filtros, texto: e.target.value || undefined })}
        />
        {hayFiltros && (
          <div className="sm:col-span-3 lg:col-span-6">
            <Boton variante="fantasma" onClick={() => setFiltros({})}>
              Quitar filtros
            </Boton>
          </div>
        )}
      </div>

      {pubs.isPending && <Cargando />}
      {pubs.error && <Aviso tipo="error">{mensajeError(pubs.error)}</Aviso>}

      {pubs.data && vista !== 'lista' && (
        <>
          {/* Cuadrícula (tableta y escritorio) */}
          <div className="hidden overflow-hidden rounded-xl border border-stone-200 bg-white sm:block">
            <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50 text-center text-xs font-medium text-stone-600">
              {DIAS_CORTOS.map((d) => (
                <div key={d} className="py-2">
                  {d}
                </div>
              ))}
            </div>
            {dias.map((semana) => (
              <div key={semana[0]} className="grid grid-cols-7 border-b border-stone-100 last:border-b-0">
                {semana.map((d) => {
                  const lista = porDia.get(d) ?? []
                  const fuera = vista === 'mes' && d.slice(5, 7) !== String(mes).padStart(2, '0')
                  const max = vista === 'semana' ? 50 : 3
                  return (
                    <div
                      key={d}
                      {...propsSoltar(d)}
                      className={
                        'min-h-28 border-r border-stone-100 p-1.5 last:border-r-0 ' +
                        (vista === 'semana' ? 'min-h-72 ' : '') +
                        (fuera ? 'bg-stone-50/70 ' : '') +
                        (sobre === d ? 'bg-marca-50 outline-2 -outline-offset-2 outline-marca-600 ' : '')
                      }
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span
                          className={
                            'grid size-6 place-items-center rounded-full text-xs ' +
                            (d === hoy ? 'bg-marca-700 font-semibold text-white' : fuera ? 'text-stone-400' : 'text-stone-700')
                          }
                          aria-label={etiquetaDia(d, true)}
                        >
                          {Number(d.slice(8))}
                        </span>
                        {editable && !sinMarcas && (
                          <Link
                            to={`/publicaciones/nueva?fecha=${d}`}
                            aria-label={`Nueva publicación el ${etiquetaDia(d)}`}
                            className="rounded px-1 text-sm leading-none text-stone-400 hover:bg-stone-100 hover:text-marca-700"
                          >
                            +
                          </Link>
                        )}
                      </div>
                      <div className="space-y-1">
                        {lista.slice(0, max).map((p) => (
                          <Ficha key={p.id} p={p} compacta={vista === 'mes'} />
                        ))}
                        {lista.length > max && (
                          <button
                            type="button"
                            onClick={() => irA(d, 'semana')}
                            className="w-full rounded px-1 text-left text-[11px] font-medium text-marca-700 hover:bg-marca-50"
                          >
                            +{lista.length - max} más
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Agenda (teléfono) */}
          <div className="space-y-3 sm:hidden">
            {dias.flat().filter((d) => porDia.has(d) && (vista === 'semana' || d.slice(5, 7) === String(mes).padStart(2, '0'))).length === 0 && (
              <p className="text-sm text-stone-500">No hay publicaciones con fecha en este periodo.</p>
            )}
            {dias
              .flat()
              .filter((d) => porDia.has(d) && (vista === 'semana' || d.slice(5, 7) === String(mes).padStart(2, '0')))
              .map((d) => (
                <section key={d}>
                  <h3 className={'mb-1 text-sm font-semibold ' + (d === hoy ? 'text-marca-700' : '')}>
                    {DIAS_CORTOS[(new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7]} {etiquetaDia(d)}
                    {d === hoy && ' · hoy'}
                  </h3>
                  <div className="space-y-1.5">
                    {porDia.get(d)!.map((p) => (
                      <Ficha key={p.id} p={p} />
                    ))}
                  </div>
                </section>
              ))}
          </div>
        </>
      )}

      {pubs.data && vista === 'lista' && (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          {visibles.length === 0 ? (
            <p className="p-4 text-sm text-stone-500">No hay publicaciones con fecha en este mes{hayFiltros ? ' con estos filtros' : ''}.</p>
          ) : (
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs text-stone-600">
                <tr>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Título</th>
                  <th className="px-3 py-2 font-medium">Marca</th>
                  <th className="px-3 py-2 font-medium">Redes</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">Responsable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visibles.map((p) => {
                  const { dia, hora } = partesLocales(p.fecha_prevista!, zona)
                  const atrasada = estaAtrasada({ estado: p.estado, fechaPrevista: p.fecha_prevista }, ahora)
                  const resp = miembros.data?.find((m) => m.usuario_id === p.responsable_id)
                  return (
                    <tr key={p.id} className="hover:bg-stone-50">
                      <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                        {etiquetaDia(dia)} · {hora}
                      </td>
                      <td className="px-3 py-2">
                        <Link className="font-medium text-marca-800 hover:underline" to={`/publicaciones/${p.id}`}>
                          {p.titulo}
                        </Link>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5">
                          <span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: marcaPorId.get(p.marca_id)?.color }} />
                          {marcaPorId.get(p.marca_id)?.nombre}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">{p.canales.join(', ') || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={'rounded-full border px-2 py-0.5 text-xs ' + COLOR_ESTADO[p.estado]}>{NOMBRE_ESTADO[p.estado]}</span>
                        {atrasada && <span className="ml-1 text-xs font-medium text-red-700">atrasada</span>}
                      </td>
                      <td className="px-3 py-2 text-xs">{p.responsable_id ? nombreDe(resp) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Banco de ideas */}
      <section aria-labelledby="ideas" className="rounded-xl border border-dashed border-stone-300 bg-white p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="ideas" className="text-base font-semibold">
            Banco de ideas y pendientes sin fecha {sinFecha.data && <span className="font-normal text-stone-500">({ideas.length})</span>}
          </h2>
          {editable && <p className="text-xs text-stone-500">Arrastra una a un día del calendario para programarla.</p>}
        </div>
        {sinFecha.isPending && <Cargando />}
        {sinFecha.data && ideas.length === 0 && (
          <p className="text-sm text-stone-500">
            {hayFiltros ? 'Ninguna idea coincide con los filtros.' : 'Sin ideas pendientes. Crea una publicación sin fecha para guardar una idea.'}
          </p>
        )}
        {ideas.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {ideas.map((p) => (
              <Ficha key={p.id} p={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
