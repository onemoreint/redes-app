/**
 * Informe de redes (plantilla 7, "IC Plantilla de informe de redes sociales 8857"), con las
 * fórmulas corregidas que documentó la auditoría:
 *   - alcance total = suma del alcance (no del compromiso)
 *   - promedios = solo entre publicaciones con datos (no cuenta filas vacías)
 *   - publicaciones por día = publicaciones del periodo ÷ días del periodo
 *   - "semana típica" = promedio semanal de los 30 días anteriores al periodo
 *   - top = orden por compromiso, calculado
 *
 * Unidad del informe: una publicación en una red (la plantilla era de una sola red).
 * Fecha que cuenta: la fecha real de publicación en esa red; si no se anotó, la fecha prevista.
 * Métrica que cuenta: la medición más reciente de esa red.
 */
import { compromiso, promedio, promedioCompromiso, tasaCompromiso, total, totalCompromiso, type Metrica } from './metricas'

export interface ResultadoRed extends Metrica {
  publicacion_id: string
  publicacion_canal_id: string
  canal: string
  marca_id: string
  titulo: string
  fecha: string // ISO
}

export const CAMPOS: (keyof Metrica)[] = ['alcance', 'impresiones', 'meGusta', 'comentarios', 'compartidos', 'guardados', 'clics', 'menciones']

export interface Resumen {
  publicaciones: number
  totales: Record<keyof Metrica, number>
  compromiso: number
  promedioCompromiso: number | null
  promedioAlcance: number | null
  tasaCompromiso: number | null // 0–1
  publicacionesPorDia: number | null
}

const DIA_MS = 86_400_000

export function enRango<T extends { fecha: string }>(lista: T[], desde: string, hasta: string): T[] {
  return lista.filter((r) => r.fecha >= desde && r.fecha < hasta)
}

export function resumir(lista: ResultadoRed[], dias: number): Resumen {
  const totales = Object.fromEntries(CAMPOS.map((c) => [c, total(lista, c)])) as Record<keyof Metrica, number>
  const comp = totalCompromiso(lista)
  return {
    publicaciones: lista.length,
    totales,
    compromiso: comp,
    promedioCompromiso: promedioCompromiso(lista),
    promedioAlcance: promedio(lista, 'alcance'),
    tasaCompromiso: tasaCompromiso(totales),
    publicacionesPorDia: dias > 0 ? lista.length / dias : null,
  }
}

/** Variación relativa (0,25 = +25 %). null si no hay base para comparar. */
export function variacion(actual: number, anterior: number): number | null {
  return anterior === 0 ? null : (actual - anterior) / anterior
}

export interface Informe {
  dias: number
  actual: Resumen
  anterior: Resumen
  semanaTipica: { publicaciones: number; compromiso: number; totales: Record<keyof Metrica, number> } | null
  mejores: ResultadoRed[]
  porRed: { canal: string; resumen: Resumen }[]
}

/**
 * @param desde, hasta  instantes UTC [desde, hasta)
 */
export function generarInforme(resultados: ResultadoRed[], desde: string, hasta: string, cantidadMejores = 5): Informe {
  const ms = new Date(hasta).getTime() - new Date(desde).getTime()
  const dias = Math.round(ms / DIA_MS)
  const antDesde = new Date(new Date(desde).getTime() - ms).toISOString()
  const refDesde = new Date(new Date(desde).getTime() - 30 * DIA_MS).toISOString()

  const actualLista = enRango(resultados, desde, hasta)
  const anteriorLista = enRango(resultados, antDesde, desde)
  const referencia = enRango(resultados, refDesde, desde)

  const semana = (v: number) => (v / 30) * 7
  const semanaTipica = referencia.length
    ? {
        publicaciones: semana(referencia.length),
        compromiso: semana(totalCompromiso(referencia)),
        totales: Object.fromEntries(CAMPOS.map((c) => [c, semana(total(referencia, c))])) as Record<keyof Metrica, number>,
      }
    : null

  const canales = [...new Set(actualLista.map((r) => r.canal))].sort()
  return {
    dias,
    actual: resumir(actualLista, dias),
    anterior: resumir(anteriorLista, dias),
    semanaTipica,
    mejores: [...actualLista].sort((a, b) => compromiso(b) - compromiso(a)).slice(0, cantidadMejores),
    porRed: canales
      .map((canal) => ({ canal, resumen: resumir(actualLista.filter((r) => r.canal === canal), dias) }))
      .sort((a, b) => b.resumen.compromiso - a.resumen.compromiso),
  }
}

/** De varias mediciones de la misma red, la más reciente (por fecha de medición). */
export function ultimaMedicion<T extends { medido_el: string }>(mediciones: T[]): T | null {
  return mediciones.reduce<T | null>((u, m) => (!u || m.medido_el > u.medido_el ? m : u), null)
}
