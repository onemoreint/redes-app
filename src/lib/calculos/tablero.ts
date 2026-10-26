/**
 * Conteos migrados desde "Plantilla de plan de publicación en redes sociales con tablero.xlsx".
 * El Excel solo admitía semanas 1–4 (COUNTIFS sobre la columna SEMANA);
 * aquí se calcula sobre fechas reales para cualquier rango.
 */
import { formatInTimeZone } from 'date-fns-tz'

export interface PublicacionParaTablero {
  fecha: string // ISO
  tipos: string[] // texto, imagen, video…
  canales: string[]
  caracteres?: number | null
}

/** 0 = lunes … 6 = domingo, como las columnas M T W Th F Sa Su del Excel. */
export function diaSemana(fechaISO: string, zonaHoraria: string): number {
  const iso = Number(formatInTimeZone(new Date(fechaISO), zonaHoraria, 'i')) // 1 = lunes … 7 = domingo
  return iso - 1
}

/** Publicaciones por día de la semana (lunes a domingo). Equivale a C4:I4 del Excel. */
export function porDiaDeSemana(lista: PublicacionParaTablero[], zonaHoraria: string): number[] {
  const out = [0, 0, 0, 0, 0, 0, 0]
  for (const p of lista) out[diaSemana(p.fecha, zonaHoraria)]++
  return out
}

/** Equivale a L4:N4 (TXT, Img, VID): cuántas publicaciones incluyen cada tipo. */
export function porTipo(lista: PublicacionParaTablero[], tipos: string[]): number[] {
  return tipos.map((t) => lista.filter((p) => p.tipos.includes(t)).length)
}

/** Equivale a Q8:AC8: total de publicaciones marcadas en cada canal. */
export function porCanal(lista: PublicacionParaTablero[], canales: string[]): number[] {
  return canales.map((c) => lista.filter((p) => p.canales.includes(c)).length)
}

/** Equivale a P6 = AVERAGE(P12:P87), ignorando publicaciones sin dato. */
export function promedioCaracteres(lista: PublicacionParaTablero[]): number | null {
  const vals = lista.map((p) => p.caracteres).filter((v): v is number => typeof v === 'number')
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

/** Fila del tablero por semana: conteo lunes..domingo y total (C4:J7 del Excel, con fechas reales). */
export interface FilaSemana {
  lunes: string
  dias: number[]
  total: number
}

/** Publicaciones por semana y día para las semanas dadas (cada semana = 7 días YYYY-MM-DD). */
export function porSemanaYDia(lista: PublicacionParaTablero[], semanas: string[][], zonaHoraria: string): FilaSemana[] {
  const filas = semanas.map((s) => ({ lunes: s[0], dias: [0, 0, 0, 0, 0, 0, 0], total: 0 }))
  for (const p of lista) {
    const dia = formatInTimeZone(new Date(p.fecha), zonaHoraria, 'yyyy-MM-dd')
    const i = semanas.findIndex((s) => s.includes(dia))
    if (i < 0) continue
    filas[i].dias[diaSemana(p.fecha, zonaHoraria)]++
    filas[i].total++
  }
  return filas
}

/** Contenido por semana y tipo (L4:N7 del Excel). */
export function porSemanaYTipo(lista: PublicacionParaTablero[], semanas: string[][], tipos: string[], zonaHoraria: string): number[][] {
  return semanas.map((s) =>
    porTipo(
      lista.filter((p) => s.includes(formatInTimeZone(new Date(p.fecha), zonaHoraria, 'yyyy-MM-dd'))),
      tipos,
    ),
  )
}

export interface Cumplimiento {
  publicadas: number
  debidas: number
  porcentaje: number | null // 0–100
}

/**
 * Cumplimiento del calendario: de las publicaciones cuya fecha prevista ya pasó
 * (sin contar las descartadas), qué parte está publicada. Sin ninguna debida -> null.
 */
export function cumplimiento(lista: { estado: string; fecha_prevista: string | null }[], ahora: Date): Cumplimiento {
  const debidas = lista.filter((p) => p.fecha_prevista && p.estado !== 'descartado' && new Date(p.fecha_prevista) <= ahora)
  const publicadas = debidas.filter((p) => p.estado === 'publicado').length
  return {
    publicadas,
    debidas: debidas.length,
    porcentaje: debidas.length ? Math.round((publicadas / debidas.length) * 100) : null,
  }
}
