/**
 * Cálculos del calendario editorial. Todas las fechas de calendario ("YYYY-MM-DD") se
 * interpretan en la zona horaria del espacio; en la base se guardan instantes UTC.
 * Las semanas empiezan en lunes, como el tablero original (M T W Th F Sa Su).
 */
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz'
import { estaAtrasada, type Estado } from './publicaciones'

export type Dia = string // YYYY-MM-DD

const aFechaUTC = (d: Dia) => new Date(`${d}T00:00:00Z`)
const aDia = (f: Date): Dia => f.toISOString().slice(0, 10)

export function sumarDias(d: Dia, n: number): Dia {
  const f = aFechaUTC(d)
  f.setUTCDate(f.getUTCDate() + n)
  return aDia(f)
}

/** 0 = lunes … 6 = domingo */
export function indiceDiaSemana(d: Dia): number {
  return (aFechaUTC(d).getUTCDay() + 6) % 7
}

export function lunesDe(d: Dia): Dia {
  return sumarDias(d, -indiceDiaSemana(d))
}

export function diasDeSemana(d: Dia): Dia[] {
  const lunes = lunesDe(d)
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))
}

/** Semanas completas (lunes a domingo) que cubren el mes. `mes` va de 1 a 12. */
export function semanasDelMes(anio: number, mes: number): Dia[][] {
  const primero = `${anio}-${String(mes).padStart(2, '0')}-01`
  const ultimo = sumarDias(aDia(new Date(Date.UTC(anio, mes, 1))), -1)
  const semanas: Dia[][] = []
  let lunes = lunesDe(primero)
  while (lunes <= ultimo) {
    semanas.push(diasDeSemana(lunes))
    lunes = sumarDias(lunes, 7)
  }
  return semanas
}

/** Instante UTC (ISO) a partir de una fecha y hora locales del espacio. */
export function aInstante(dia: Dia, hora: string, zona: string): string {
  return fromZonedTime(`${dia}T${hora || '09:00'}:00`, zona).toISOString()
}

/** Fecha y hora locales del espacio para un instante. */
export function partesLocales(iso: string, zona: string): { dia: Dia; hora: string } {
  return { dia: formatInTimeZone(new Date(iso), zona, 'yyyy-MM-dd'), hora: formatInTimeZone(new Date(iso), zona, 'HH:mm') }
}

/** Mueve una publicación a otro día conservando su hora local (correcto aunque cambie el horario de verano). */
export function moverADia(iso: string, nuevoDia: Dia, zona: string): string {
  return aInstante(nuevoDia, partesLocales(iso, zona).hora, zona)
}

/** Límites [desde, hasta) en UTC para consultar un rango de días locales. */
export function rangoUTC(desde: Dia, hastaIncluido: Dia, zona: string): { desde: string; hasta: string } {
  return { desde: aInstante(desde, '00:00', zona), hasta: aInstante(sumarDias(hastaIncluido, 1), '00:00', zona) }
}

export interface PublicacionCalendario {
  id: string
  marca_id: string
  titulo: string
  estado: Estado
  fecha_prevista: string | null
  responsable_id: string | null
  categoria: string
  texto: string
  canales: string[]
}

/** Agrupa por día local y ordena por hora. Las que no tienen fecha no aparecen. */
export function agruparPorDia<T extends PublicacionCalendario>(lista: T[], zona: string): Map<Dia, T[]> {
  const mapa = new Map<Dia, T[]>()
  for (const p of lista) {
    if (!p.fecha_prevista) continue
    const d = partesLocales(p.fecha_prevista, zona).dia
    const arr = mapa.get(d) ?? []
    arr.push(p)
    mapa.set(d, arr)
  }
  for (const arr of mapa.values()) arr.sort((a, b) => a.fecha_prevista!.localeCompare(b.fecha_prevista!))
  return mapa
}

export interface Filtros {
  marca?: string
  canal?: string
  estado?: Estado | 'atrasadas' | 'activas'
  responsable?: string // id o 'sin'
  categoria?: string
  texto?: string
}

const ESTADOS_CERRADOS: Estado[] = ['publicado', 'descartado']

export function filtrar<T extends PublicacionCalendario>(lista: T[], f: Filtros, ahora: Date): T[] {
  const q = f.texto?.trim().toLowerCase()
  return lista.filter((p) => {
    if (f.marca && p.marca_id !== f.marca) return false
    if (f.canal && !p.canales.includes(f.canal)) return false
    if (f.estado === 'atrasadas' && !estaAtrasada({ estado: p.estado, fechaPrevista: p.fecha_prevista }, ahora)) return false
    if (f.estado === 'activas' && ESTADOS_CERRADOS.includes(p.estado)) return false
    if (f.estado && f.estado !== 'atrasadas' && f.estado !== 'activas' && p.estado !== f.estado) return false
    if (f.responsable === 'sin' && p.responsable_id) return false
    if (f.responsable && f.responsable !== 'sin' && p.responsable_id !== f.responsable) return false
    if (f.categoria && p.categoria !== f.categoria) return false
    if (q && !p.titulo.toLowerCase().includes(q) && !p.texto.toLowerCase().includes(q)) return false
    return true
  })
}
