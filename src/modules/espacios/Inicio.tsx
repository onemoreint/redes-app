import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/datos/supabase'
import { exigir, mensajeError } from '../../lib/datos/errores'
import { NOMBRE_ROL, puede } from '../../lib/roles'
import { CANALES } from '../../lib/canales'
import { contarCaracteres } from '../../lib/calculos/publicaciones'
import { partesLocales, rangoUTC, semanasDelMes, sumarDias } from '../../lib/calculos/calendario'
import { cumplimiento, porCanal, porSemanaYDia, porSemanaYTipo, promedioCaracteres } from '../../lib/calculos/tablero'
import { Aviso, Cargando, Selector, Tarjeta } from '../../components/ui'
import { useEspacio } from '../../app/espacio'
import { nombreDe, useMiembros } from '../../app/miembros'
import { usePerfil } from '../cuenta/MiCuenta'
import { hoyEn, useMarcas } from '../marcas/datos'
import { usePublicacionesRango, type PublicacionConCanales } from '../publicaciones/datos'
import { COLOR_ESTADO, NOMBRE_ESTADO, TIPOS } from '../publicaciones/catalogos'
import { usePendientes } from '../revision/datos'
import { PrimerosPasos } from './PrimerosPasos'

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const ACTIVOS = ['borrador', 'en_revision', 'aprobado', 'programado'] as const

function useAtrasadas(espacio: string) {
  return useQuery({
    queryKey: ['publicaciones', espacio, 'atrasadas'],
    queryFn: async () =>
      exigir(
        await supabase
          .from('publicaciones')
          .select('*')
          .eq('espacio_id', espacio)
          .in('estado', [...ACTIVOS])
          .lt('fecha_prevista', new Date().toISOString())
          .order('fecha_prevista'),
      ),
  })
}

function useConteoEstados(espacio: string) {
  return useQuery({
    queryKey: ['publicaciones', espacio, 'conteo-estados'],
    queryFn: async () => {
      const filas = exigir(await supabase.from('publicaciones').select('estado').eq('espacio_id', espacio))
      const c: Record<string, number> = {}
      for (const f of filas) c[f.estado] = (c[f.estado] ?? 0) + 1
      return c
    },
  })
}

export default function Inicio() {
  const { actual } = useEspacio()
  const espacio = actual!.id
  const zona = actual!.zona_horaria
  const hoy = hoyEn(zona)
  const perfil = usePerfil()
  const marcas = useMarcas(espacio)
  const miembros = useMiembros(espacio)
  const editable = puede.editar(actual?.rol)

  // Próximos 7 días
  const proximoRango = rangoUTC(hoy, sumarDias(hoy, 6), zona)
  const ahoraISO = useMemo(() => new Date().toISOString(), [])
  const proximas = usePublicacionesRango(espacio, ahoraISO, proximoRango.hasta)
  const atrasadas = useAtrasadas(espacio)
  const pendientes = usePendientes(espacio)
  const estados = useConteoEstados(espacio)

  // Tablero del mes
  const [mesSel, setMesSel] = useState(hoy.slice(0, 7))
  const [marcaSel, setMarcaSel] = useState('')
  const [anio, mes] = mesSel.split('-').map(Number)
  const semanas = semanasDelMes(anio, mes)
  const rangoMes = rangoUTC(`${mesSel}-01`, sumarDias(`${anio + (mes === 12 ? 1 : 0)}-${String((mes % 12) + 1).padStart(2, '0')}-01`, -1), zona)
  const delMes = usePublicacionesRango(espacio, rangoMes.desde, rangoMes.hasta)

  const marcaPorId = useMemo(() => new Map((marcas.data ?? []).map((m) => [m.id, m])), [marcas.data])
  const nombre = perfil.data?.nombre?.split(' ')[0]

  const tablero = useMemo(() => {
    const lista = (delMes.data ?? []).filter((p) => p.estado !== 'descartado' && (!marcaSel || p.marca_id === marcaSel))
    const items = lista.map((p) => ({
      fecha: p.fecha_prevista!,
      tipos: p.tipos,
      canales: p.canales,
      caracteres: p.texto || p.hashtags ? contarCaracteres(p.texto, p.hashtags) : null,
    }))
    return {
      total: lista.length,
      semanas: porSemanaYDia(items, semanas, zona),
      tipos: porSemanaYTipo(items, semanas, [...TIPOS], zona),
      canales: porCanal(items, [...CANALES]),
      caracteres: promedioCaracteres(items),
      cumplimiento: cumplimiento(lista, new Date()),
      publicadas: lista.filter((p) => p.estado === 'publicado').length,
    }
  }, [delMes.data, marcaSel, semanas, zona])

  const enProceso = (estados.data?.borrador ?? 0) + (estados.data?.en_revision ?? 0) + (estados.data?.aprobado ?? 0) + (estados.data?.programado ?? 0)
  const meses = useMemo(() => {
    const lista: string[] = []
    for (let i = -6; i <= 6; i++) {
      const d = new Date(Date.UTC(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)) - 1 + i, 1))
      lista.push(d.toISOString().slice(0, 7))
    }
    return lista
  }, [hoy])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{nombre ? `Hola, ${nombre}` : 'Inicio'}</h1>
          <p className="mt-1 text-sm text-stone-600">
            {actual!.nombre} · {NOMBRE_ROL[actual!.rol]}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editable && (marcas.data?.length ?? 0) > 0 && (
            <Link to="/publicaciones/nueva" className="inline-flex min-h-10 items-center rounded-lg bg-marca-700 px-4 py-2 text-sm font-medium text-white hover:bg-marca-800">
              Nueva publicación
            </Link>
          )}
          <Link to="/calendario" className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium hover:bg-stone-50">
            Calendario
          </Link>
        </div>
      </div>

      <PrimerosPasos espacio={actual!} />

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador titulo="Próximos 7 días" valor={proximas.data?.filter((p) => p.estado !== 'descartado').length} enlace="/calendario?vista=semana" />
        <Indicador titulo="Atrasadas" valor={atrasadas.data?.length} alerta={(atrasadas.data?.length ?? 0) > 0} enlace="/calendario?vista=lista" />
        <Indicador titulo="Pendientes de aprobar" valor={pendientes.data?.length} enlace="/revision" />
        <Indicador titulo="En proceso" valor={estados.data ? enProceso : undefined} detalle="Borrador a programado" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Tarjeta titulo="Próximas publicaciones" descripcion="Los próximos 7 días.">
          {proximas.isPending && <Cargando />}
          {proximas.error && <Aviso tipo="error">{mensajeError(proximas.error)}</Aviso>}
          {proximas.data && <ListaPublicaciones lista={proximas.data.filter((p) => p.estado !== 'descartado')} vacio="Nada programado para los próximos 7 días." />}
        </Tarjeta>
        <Tarjeta titulo="Atrasadas" descripcion="Su fecha pasó y aún no se publican.">
          {atrasadas.isPending && <Cargando />}
          {atrasadas.error && <Aviso tipo="error">{mensajeError(atrasadas.error)}</Aviso>}
          {atrasadas.data && (
            <ListaPublicaciones lista={atrasadas.data.map((p) => ({ ...p, canales: [] }))} vacio="Nada atrasado. ¡Bien!" alerta />
          )}
        </Tarjeta>
      </div>

      {/* Tablero mensual (plantilla de plan de publicación con tablero) */}
      <Tarjeta
        titulo={`Tablero de ${MESES[mes - 1]} ${anio}`}
        descripcion="Publicaciones planificadas del mes (sin descartadas), como en tu plantilla con tablero, pero con fechas reales."
        acciones={
          <div className="flex flex-wrap gap-2">
            <Selector etiqueta="Mes" ocultarEtiqueta value={mesSel} onChange={(e) => setMesSel(e.target.value)} className="w-40">
              {meses.map((m) => (
                <option key={m} value={m}>
                  {MESES[Number(m.slice(5)) - 1]} {m.slice(0, 4)}
                </option>
              ))}
            </Selector>
            <Selector etiqueta="Marca" ocultarEtiqueta value={marcaSel} onChange={(e) => setMarcaSel(e.target.value)} className="w-40">
              <option value="">Todas las marcas</option>
              {(marcas.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </Selector>
          </div>
        }
      >
        {delMes.isPending && <Cargando />}
        {delMes.error && <Aviso tipo="error">{mensajeError(delMes.error)}</Aviso>}
        {delMes.data && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Dato titulo="Planificadas" valor={String(tablero.total)} />
              <Dato titulo="Publicadas" valor={String(tablero.publicadas)} />
              <Dato
                titulo="Cumplimiento"
                valor={tablero.cumplimiento.porcentaje == null ? '—' : `${tablero.cumplimiento.porcentaje} %`}
                ayuda={
                  tablero.cumplimiento.debidas
                    ? `${tablero.cumplimiento.publicadas} de ${tablero.cumplimiento.debidas} con fecha ya pasada`
                    : 'Aún no hay fechas vencidas'
                }
              />
              <Dato titulo="Caracteres promedio" valor={tablero.caracteres == null ? '—' : String(Math.round(tablero.caracteres))} />
            </div>

            {tablero.total === 0 ? (
              <p className="text-sm text-stone-500">No hay publicaciones con fecha en este mes{marcaSel ? ' para esta marca' : ''}.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[34rem] text-center text-sm">
                    <caption className="mb-2 text-left text-sm font-medium">Publicaciones por día de la semana</caption>
                    <thead className="text-xs text-stone-500">
                      <tr>
                        <th className="py-1 text-left font-medium">Semana del</th>
                        {DIAS.map((d) => (
                          <th key={d} className="py-1 font-medium">
                            {d}
                          </th>
                        ))}
                        <th className="py-1 font-medium">Total</th>
                        {TIPOS.slice(0, 4).map((t) => (
                          <th key={t} className="py-1 font-medium text-stone-400">
                            {t}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {tablero.semanas.map((s, i) => (
                        <tr key={s.lunes}>
                          <td className="py-1.5 text-left tabular-nums text-stone-600">
                            {Number(s.lunes.slice(8))} {MESES[Number(s.lunes.slice(5, 7)) - 1].slice(0, 3)}
                          </td>
                          {s.dias.map((n, d) => (
                            <td key={d} className="py-1.5 tabular-nums">
                              <span className={n ? 'inline-grid min-w-6 place-items-center rounded bg-marca-100 px-1 font-medium text-marca-800' : 'text-stone-300'}>
                                {n}
                              </span>
                            </td>
                          ))}
                          <td className="py-1.5 font-semibold tabular-nums">{s.total}</td>
                          {tablero.tipos[i].slice(0, 4).map((n, t) => (
                            <td key={t} className="py-1.5 tabular-nums text-stone-500">
                              {n || ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-medium">Publicaciones por red</h3>
                  <Barras etiquetas={[...CANALES]} valores={tablero.canales} />
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-medium">Publicaciones por formato</h3>
                  <Barras etiquetas={[...TIPOS]} valores={TIPOS.map((_, t) => tablero.tipos.reduce((s, fila) => s + fila[t], 0))} />
                </div>
              </>
            )}
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Estado de todo el contenido">
        {estados.isPending && <Cargando />}
        {estados.data && (
          <ul className="flex flex-wrap gap-2">
            {(['idea', 'borrador', 'en_revision', 'aprobado', 'programado', 'publicado', 'en_pausa', 'descartado'] as const).map((s) => (
              <li key={s} className={'rounded-full border px-3 py-1 text-sm ' + COLOR_ESTADO[s]}>
                {NOMBRE_ESTADO[s]}: <strong>{estados.data[s] ?? 0}</strong>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-stone-500">
          {marcas.data?.filter((m) => !m.archivada).length ?? '…'} marcas activas · {miembros.data?.length ?? '…'} miembros
        </p>
      </Tarjeta>
    </div>
  )

  function ListaPublicaciones({ lista, vacio, alerta = false }: { lista: PublicacionConCanales[]; vacio: string; alerta?: boolean }) {
    if (lista.length === 0) return <p className="text-sm text-stone-500">{vacio}</p>
    return (
      <ul className="divide-y divide-stone-100">
        {lista.slice(0, 8).map((p) => {
          const { dia, hora } = partesLocales(p.fecha_prevista!, zona)
          const m = marcaPorId.get(p.marca_id)
          const resp = miembros.data?.find((x) => x.usuario_id === p.responsable_id)
          return (
            <li key={p.id} className="flex items-start gap-3 py-2">
              <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: m?.color }} />
              <div className="min-w-0 flex-1">
                <Link to={`/publicaciones/${p.id}`} className="block truncate text-sm font-medium text-marca-800 hover:underline">
                  {p.titulo}
                </Link>
                <p className={'text-xs ' + (alerta ? 'text-red-700' : 'text-stone-500')}>
                  {dia === hoy ? 'Hoy' : `${Number(dia.slice(8))} ${MESES[Number(dia.slice(5, 7)) - 1].slice(0, 3)}`} · {hora} · {m?.nombre}
                  {p.responsable_id && ` · ${nombreDe(resp)}`}
                </p>
              </div>
              <span className={'shrink-0 rounded-full border px-2 py-0.5 text-[11px] ' + COLOR_ESTADO[p.estado]}>{NOMBRE_ESTADO[p.estado]}</span>
            </li>
          )
        })}
        {lista.length > 8 && (
          <li className="pt-2 text-xs">
            <Link className="text-marca-700 hover:underline" to="/calendario?vista=lista">
              Ver las {lista.length} en el calendario
            </Link>
          </li>
        )}
      </ul>
    )
  }
}

function Indicador({ titulo, valor, detalle, enlace, alerta }: { titulo: string; valor?: number; detalle?: string; enlace?: string; alerta?: boolean }) {
  const contenido = (
    <>
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{titulo}</p>
      <p className={'mt-1 text-2xl font-semibold tabular-nums ' + (alerta ? 'text-red-700' : '')}>{valor ?? '…'}</p>
      {detalle && <p className="text-xs text-stone-500">{detalle}</p>}
    </>
  )
  const clase = 'block rounded-xl border bg-white p-4 ' + (alerta ? 'border-red-200' : 'border-stone-200')
  return enlace ? (
    <Link to={enlace} className={clase + ' hover:border-marca-600'}>
      {contenido}
    </Link>
  ) : (
    <div className={clase}>{contenido}</div>
  )
}

function Dato({ titulo, valor, ayuda }: { titulo: string; valor: string; ayuda?: string }) {
  return (
    <div className="rounded-lg bg-stone-50 p-3">
      <p className="text-xs text-stone-500">{titulo}</p>
      <p className="text-xl font-semibold tabular-nums">{valor}</p>
      {ayuda && <p className="text-[11px] text-stone-500">{ayuda}</p>}
    </div>
  )
}

function Barras({ etiquetas, valores }: { etiquetas: string[]; valores: number[] }) {
  const max = Math.max(1, ...valores)
  const filas = etiquetas.map((e, i) => ({ e, v: valores[i] })).filter((f) => f.v > 0)
  if (filas.length === 0) return <p className="text-sm text-stone-500">Sin datos.</p>
  return (
    <ul className="space-y-1.5">
      {filas.map(({ e, v }) => (
        <li key={e} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-2 text-sm">
          <span className="truncate text-stone-700">{e}</span>
          <span className="h-3 rounded bg-stone-100">
            <span className="block h-3 rounded bg-marca-600" style={{ width: `${(v / max) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums">{v}</span>
        </li>
      ))}
    </ul>
  )
}
