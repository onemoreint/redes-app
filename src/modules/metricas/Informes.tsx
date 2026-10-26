import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/datos/supabase'
import { exigir, mensajeError } from '../../lib/datos/errores'
import type { MetricaFila } from '../../lib/datos/tipos-bd'
import { CANALES } from '../../lib/canales'
import { compromiso, type Metrica } from '../../lib/calculos/metricas'
import { generarInforme, variacion, type ResultadoRed } from '../../lib/calculos/informe'
import { diasDeSemana, partesLocales, rangoUTC, sumarDias } from '../../lib/calculos/calendario'
import { aCSV, descargar } from '../../lib/csv'
import { Aviso, Boton, Campo, Cargando, Encabezado, Selector, Tarjeta } from '../../components/ui'
import { useEspacio } from '../../app/espacio'
import { hoyEn, useMarcas } from '../marcas/datos'
import { aMetrica } from './Resultados'

type Periodo = 'esta-semana' | 'semana-pasada' | 'este-mes' | 'mes-pasado' | 'ultimos-7' | 'ultimos-30' | 'personalizado'
const PERIODOS: { id: Periodo; texto: string }[] = [
  { id: 'esta-semana', texto: 'Esta semana' },
  { id: 'semana-pasada', texto: 'Semana pasada' },
  { id: 'ultimos-7', texto: 'Últimos 7 días' },
  { id: 'este-mes', texto: 'Este mes' },
  { id: 'mes-pasado', texto: 'Mes pasado' },
  { id: 'ultimos-30', texto: 'Últimos 30 días' },
  { id: 'personalizado', texto: 'Personalizado' },
]

const ETIQUETAS: Record<keyof Metrica, string> = {
  alcance: 'Alcance',
  impresiones: 'Impresiones',
  meGusta: 'Me gusta',
  comentarios: 'Comentarios',
  compartidos: 'Compartidos',
  guardados: 'Guardados',
  clics: 'Clics',
  menciones: 'Menciones',
}

const num = new Intl.NumberFormat('es', { maximumFractionDigits: 1 })
const pct = (v: number | null) => (v == null ? '—' : `${(v * 100).toFixed(1).replace('.', ',')} %`)

/** Días locales [desde, hasta] del periodo elegido. */
function diasDelPeriodo(p: Periodo, hoy: string, propio: { desde: string; hasta: string }): { desde: string; hasta: string } {
  const lunes = diasDeSemana(hoy)[0]
  const primeroMes = `${hoy.slice(0, 7)}-01`
  const [a, m] = hoy.split('-').map(Number)
  const primeroAnterior = `${m === 1 ? a - 1 : a}-${String(m === 1 ? 12 : m - 1).padStart(2, '0')}-01`
  switch (p) {
    case 'esta-semana':
      return { desde: lunes, hasta: sumarDias(lunes, 6) }
    case 'semana-pasada':
      return { desde: sumarDias(lunes, -7), hasta: sumarDias(lunes, -1) }
    case 'ultimos-7':
      return { desde: sumarDias(hoy, -6), hasta: hoy }
    case 'este-mes': {
      const sig = `${m === 12 ? a + 1 : a}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}-01`
      return { desde: primeroMes, hasta: sumarDias(sig, -1) }
    }
    case 'mes-pasado':
      return { desde: primeroAnterior, hasta: sumarDias(primeroMes, -1) }
    case 'ultimos-30':
      return { desde: sumarDias(hoy, -29), hasta: hoy }
    default:
      return propio
  }
}

type FilaConsulta = MetricaFila & {
  publicacion_canales: {
    canal: string
    fecha_publicada: string | null
    publicaciones: { id: string; titulo: string; marca_id: string; fecha_prevista: string | null } | null
  } | null
}

export function useResultados(espacio: string) {
  return useQuery({
    queryKey: ['metricas', 'espacio', espacio],
    queryFn: async (): Promise<ResultadoRed[]> => {
      const filas = exigir(
        await supabase
          .from('metricas')
          .select('*, publicacion_canales(canal, fecha_publicada, publicaciones(id, titulo, marca_id, fecha_prevista))')
          .eq('espacio_id', espacio),
      ) as unknown as FilaConsulta[]
      const ultima = new Map<string, FilaConsulta>()
      for (const f of filas) {
        const u = ultima.get(f.publicacion_canal_id)
        if (!u || f.medido_el > u.medido_el) ultima.set(f.publicacion_canal_id, f)
      }
      const res: ResultadoRed[] = []
      for (const f of ultima.values()) {
        const c = f.publicacion_canales
        const p = c?.publicaciones
        const fecha = c?.fecha_publicada ?? p?.fecha_prevista ?? `${f.medido_el}T12:00:00.000Z`
        if (!c || !p) continue
        res.push({ ...aMetrica(f), publicacion_id: p.id, publicacion_canal_id: f.publicacion_canal_id, canal: c.canal, marca_id: p.marca_id, titulo: p.titulo, fecha })
      }
      return res
    },
  })
}

export default function Informes() {
  const { actual } = useEspacio()
  const espacio = actual!.id
  const zona = actual!.zona_horaria
  const hoy = hoyEn(zona)
  const marcas = useMarcas(espacio)
  const resultados = useResultados(espacio)
  const [periodo, setPeriodo] = useState<Periodo>('ultimos-30')
  const [propio, setPropio] = useState({ desde: sumarDias(hoy, -29), hasta: hoy })
  const [marca, setMarca] = useState('')
  const [canal, setCanal] = useState('')

  const dias = diasDelPeriodo(periodo, hoy, propio)
  const rangoValido = dias.desde && dias.hasta && dias.desde <= dias.hasta
  const rango = rangoValido ? rangoUTC(dias.desde, dias.hasta, zona) : null
  const marcaPorId = useMemo(() => new Map((marcas.data ?? []).map((m) => [m.id, m])), [marcas.data])

  const informe = useMemo(() => {
    if (!resultados.data || !rango) return null
    const lista = resultados.data.filter((r) => (!marca || r.marca_id === marca) && (!canal || r.canal === canal))
    return { inf: generarInforme(lista, rango.desde, rango.hasta), lista }
  }, [resultados.data, rango?.desde, rango?.hasta, marca, canal]) // eslint-disable-line react-hooks/exhaustive-deps

  const fechaCorta = (iso: string) => {
    const { dia } = partesLocales(iso, zona)
    return new Date(`${dia}T12:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short' })
  }

  function exportar() {
    if (!informe || !rango) return
    const filas = informe.lista
      .filter((r) => r.fecha >= rango.desde && r.fecha < rango.hasta)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((r) => [
        partesLocales(r.fecha, zona).dia,
        marcaPorId.get(r.marca_id)?.nombre ?? '',
        r.titulo,
        r.canal,
        r.alcance,
        r.impresiones,
        r.meGusta,
        r.comentarios,
        r.compartidos,
        r.guardados,
        r.clics,
        r.menciones,
        compromiso(r),
        'manual',
      ])
    descargar(
      `informe-${actual!.nombre.replace(/[^\p{L}\p{N}]+/gu, '-')}-${dias.desde}-a-${dias.hasta}.csv`,
      aCSV(
        ['Fecha', 'Marca', 'Publicación', 'Red', 'Alcance', 'Impresiones', 'Me gusta', 'Comentarios', 'Compartidos', 'Guardados', 'Clics', 'Menciones', 'Compromiso', 'Origen del dato'],
        filas,
      ),
    )
  }

  const inf = informe?.inf

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Informes"
        descripcion="Resultados de tus publicaciones por periodo. Las cifras son las que registras a mano en cada publicación; la app no se conecta con las redes."
        acciones={
          inf && inf.actual.publicaciones > 0 ? (
            <Boton variante="secundario" onClick={exportar}>
              Descargar CSV
            </Boton>
          ) : undefined
        }
      />

      <div className="grid gap-3 rounded-xl border border-stone-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
        <Selector etiqueta="Periodo" value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)}>
          {PERIODOS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.texto}
            </option>
          ))}
        </Selector>
        <Selector etiqueta="Marca" value={marca} onChange={(e) => setMarca(e.target.value)}>
          <option value="">Todas</option>
          {(marcas.data ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre}
            </option>
          ))}
        </Selector>
        <Selector etiqueta="Red" value={canal} onChange={(e) => setCanal(e.target.value)}>
          <option value="">Todas</option>
          {CANALES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Selector>
        <div className="text-sm text-stone-600 sm:self-end sm:pb-2">
          {rangoValido ? `Del ${dias.desde} al ${dias.hasta}` : 'Elige un rango válido'}
        </div>
        {periodo === 'personalizado' && (
          <>
            <Campo etiqueta="Desde" type="date" value={propio.desde} onChange={(e) => setPropio({ ...propio, desde: e.target.value })} />
            <Campo
              etiqueta="Hasta"
              type="date"
              value={propio.hasta}
              onChange={(e) => setPropio({ ...propio, hasta: e.target.value })}
              error={propio.desde > propio.hasta ? 'Debe ser posterior a «Desde»' : null}
            />
          </>
        )}
      </div>

      {resultados.isPending && <Cargando />}
      {resultados.error && <Aviso tipo="error">{mensajeError(resultados.error)}</Aviso>}

      {inf && inf.actual.publicaciones === 0 && (
        <Tarjeta titulo="Sin resultados en este periodo">
          <p className="text-sm text-stone-600">
            Para ver un informe, abre una publicación del{' '}
            <Link className="text-marca-700 hover:underline" to="/calendario">
              calendario
            </Link>{' '}
            y registra sus resultados en la sección «Resultados». Cuentan por la fecha en que se publicó en cada red.
          </p>
        </Tarjeta>
      )}

      {inf && inf.actual.publicaciones > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi titulo="Alcance total" valor={inf.actual.totales.alcance} anterior={inf.anterior.totales.alcance} tipica={inf.semanaTipica?.totales.alcance} dias={inf.dias} />
            <Kpi titulo="Compromiso total" valor={inf.actual.compromiso} anterior={inf.anterior.compromiso} tipica={inf.semanaTipica?.compromiso} dias={inf.dias} />
            <Kpi titulo="Publicaciones con resultados" valor={inf.actual.publicaciones} anterior={inf.anterior.publicaciones} tipica={inf.semanaTipica?.publicaciones} dias={inf.dias} />
            <Kpi titulo="Clics" valor={inf.actual.totales.clics} anterior={inf.anterior.totales.clics} tipica={inf.semanaTipica?.totales.clics} dias={inf.dias} />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <Mini titulo="Compromiso promedio por publicación" valor={inf.actual.promedioCompromiso == null ? '—' : num.format(inf.actual.promedioCompromiso)} />
            <Mini titulo="Alcance promedio por publicación" valor={inf.actual.promedioAlcance == null ? '—' : num.format(inf.actual.promedioAlcance)} />
            <Mini titulo="Tasa de compromiso" valor={pct(inf.actual.tasaCompromiso)} ayuda="Compromiso ÷ alcance" />
            <Mini titulo="Publicaciones por día" valor={inf.actual.publicacionesPorDia == null ? '—' : num.format(inf.actual.publicacionesPorDia)} />
          </div>

          <Tarjeta titulo="Totales del periodo" descripcion={`Comparado con los ${inf.dias} días anteriores.`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-right text-sm">
                <thead className="text-xs text-stone-500">
                  <tr>
                    <th className="py-1 text-left font-medium">Métrica</th>
                    <th className="py-1 font-medium">Este periodo</th>
                    <th className="py-1 font-medium">Periodo anterior</th>
                    <th className="py-1 font-medium">Cambio</th>
                    <th className="py-1 font-medium">Semana típica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 tabular-nums">
                  {(Object.keys(ETIQUETAS) as (keyof Metrica)[]).map((k) => (
                    <tr key={k}>
                      <td className="py-1.5 text-left">{ETIQUETAS[k]}</td>
                      <td className="py-1.5 font-medium">{num.format(inf.actual.totales[k])}</td>
                      <td className="py-1.5 text-stone-600">{num.format(inf.anterior.totales[k])}</td>
                      <td className="py-1.5">
                        <Cambio v={variacion(inf.actual.totales[k], inf.anterior.totales[k])} />
                      </td>
                      <td className="py-1.5 text-stone-600">{inf.semanaTipica ? num.format(inf.semanaTipica.totales[k]) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-stone-500">«Semana típica»: promedio semanal de los 30 días anteriores al periodo. Compromiso = me gusta + comentarios + compartidos + guardados + clics + menciones.</p>
          </Tarjeta>

          <Tarjeta titulo="Mejores publicaciones" descripcion="Las 5 con más compromiso en el periodo.">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-sm">
                <thead className="text-xs text-stone-500">
                  <tr>
                    <th className="py-1 text-left font-medium">Fecha</th>
                    <th className="py-1 text-left font-medium">Publicación</th>
                    <th className="py-1 text-left font-medium">Red</th>
                    <th className="py-1 text-right font-medium">Alcance</th>
                    <th className="py-1 text-right font-medium">Compromiso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {inf.mejores.map((r) => (
                    <tr key={r.publicacion_canal_id}>
                      <td className="py-1.5 tabular-nums">{fechaCorta(r.fecha)}</td>
                      <td className="py-1.5">
                        <Link className="text-marca-800 hover:underline" to={`/publicaciones/${r.publicacion_id}`}>
                          {r.titulo}
                        </Link>
                        <span className="block text-xs text-stone-500">{marcaPorId.get(r.marca_id)?.nombre}</span>
                      </td>
                      <td className="py-1.5">{r.canal}</td>
                      <td className="py-1.5 text-right tabular-nums">{r.alcance == null ? '—' : num.format(r.alcance)}</td>
                      <td className="py-1.5 text-right font-semibold tabular-nums">{num.format(compromiso(r))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tarjeta>

          <Tarjeta titulo="Por red">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-right text-sm">
                <thead className="text-xs text-stone-500">
                  <tr>
                    <th className="py-1 text-left font-medium">Red</th>
                    <th className="py-1 font-medium">Publicaciones</th>
                    <th className="py-1 font-medium">Alcance</th>
                    <th className="py-1 font-medium">Compromiso</th>
                    <th className="py-1 font-medium">Promedio</th>
                    <th className="py-1 font-medium">Tasa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 tabular-nums">
                  {inf.porRed.map(({ canal: c, resumen }) => (
                    <tr key={c}>
                      <td className="py-1.5 text-left">{c}</td>
                      <td className="py-1.5">{resumen.publicaciones}</td>
                      <td className="py-1.5">{num.format(resumen.totales.alcance)}</td>
                      <td className="py-1.5 font-medium">{num.format(resumen.compromiso)}</td>
                      <td className="py-1.5">{resumen.promedioCompromiso == null ? '—' : num.format(resumen.promedioCompromiso)}</td>
                      <td className="py-1.5">{pct(resumen.tasaCompromiso)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Tarjeta>
        </>
      )}
    </div>
  )
}

function Cambio({ v }: { v: number | null }) {
  if (v == null) return <span className="text-stone-400">—</span>
  const color = v > 0 ? 'text-emerald-700' : v < 0 ? 'text-red-700' : 'text-stone-500'
  return (
    <span className={color}>
      {v > 0 ? '▲ ' : v < 0 ? '▼ ' : ''}
      {pct(Math.abs(v))}
    </span>
  )
}

function Kpi({ titulo, valor, anterior, tipica, dias }: { titulo: string; valor: number; anterior: number; tipica?: number; dias: number }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{num.format(valor)}</p>
      <p className="text-xs">
        <Cambio v={variacion(valor, anterior)} /> <span className="text-stone-500">vs. {dias} días anteriores</span>
      </p>
      {tipica != null && <p className="text-xs text-stone-500">Semana típica: {num.format(tipica)}</p>}
    </div>
  )
}

function Mini({ titulo, valor, ayuda }: { titulo: string; valor: string; ayuda?: string }) {
  return (
    <div className="rounded-lg bg-white p-3 ring-1 ring-stone-200">
      <p className="text-xs text-stone-500">{titulo}</p>
      <p className="text-lg font-semibold tabular-nums">{valor}</p>
      {ayuda && <p className="text-[11px] text-stone-500">{ayuda}</p>}
    </div>
  )
}
