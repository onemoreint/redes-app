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
