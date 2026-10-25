/**
 * Cálculos de métricas migrados desde la plantilla
 * "IC Plantilla de informe de redes sociales 8857.xlsx".
 *
 * Correspondencia con el Excel original (documentada en la auditoría, Etapa 1):
 *   Retweets  -> compartidos
 *   GUSTOS    -> meGusta
 *   Menciones -> menciones
 *   Clics     -> clics
 *   POTENCIAL -> alcance
 *
 * Cambio de significado aprobado (Etapa 2, pregunta abierta 1):
 *   Excel:  COMPROMISO = Retweets + Gustos + Menciones + Clics   (Report Data!I8 = SUM(D8:G8))
 *   App:    compromiso = compartidos + meGusta + comentarios + guardados + menciones + clics
 * Con comentarios y guardados en 0 ambos dan el mismo resultado.
 */

export interface Metrica {
  alcance?: number | null
  impresiones?: number | null
  meGusta?: number | null
  comentarios?: number | null
  compartidos?: number | null
  guardados?: number | null
  clics?: number | null
  menciones?: number | null
}

const n = (v: number | null | undefined): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0)

export function compromiso(m: Metrica): number {
  return n(m.compartidos) + n(m.meGusta) + n(m.comentarios) + n(m.guardados) + n(m.menciones) + n(m.clics)
}

/** Compromiso ÷ alcance. Devuelve null si no hay alcance (no se puede dividir entre 0). */
export function tasaCompromiso(m: Metrica): number | null {
  const a = n(m.alcance)
  return a > 0 ? compromiso(m) / a : null
}

export type CampoMetrica = keyof Metrica

export function total(lista: Metrica[], campo: CampoMetrica): number {
  return lista.reduce((s, m) => s + n(m[campo]), 0)
}

export function totalCompromiso(lista: Metrica[]): number {
  return lista.reduce((s, m) => s + compromiso(m), 0)
}

/**
 * Promedio por publicación. Corrige el error del Excel: AVERAGE(I8:I1004)
 * contaba las filas vacías con fórmula como 0 (mostraba 25,4 en vez de 625,8).
 * Aquí solo cuentan las publicaciones que existen. Lista vacía -> null.
 */
export function promedio(lista: Metrica[], campo: CampoMetrica): number | null {
  return lista.length ? total(lista, campo) / lista.length : null
}

export function promedioCompromiso(lista: Metrica[]): number | null {
  return lista.length ? totalCompromiso(lista) / lista.length : null
}

/** Ordena por compromiso, de mayor a menor, y toma las primeras `cantidad`. */
export function mejores<T extends Metrica>(lista: T[], cantidad: number): T[] {
  return [...lista].sort((a, b) => compromiso(b) - compromiso(a)).slice(0, cantidad)
}

/**
 * Publicaciones por día. Corrige S4 = COUNT(B:B)/30, que dividía
 * las publicaciones de una semana entre 30 días.
 */
export function publicacionesPorDia(cantidadPublicaciones: number, diasDelPeriodo: number): number | null {
  return diasDelPeriodo > 0 ? cantidadPublicaciones / diasDelPeriodo : null
}

/**
 * "Semana típica": promedio semanal de un valor medido durante `diasReferencia` días.
 * Corrige las variantes SUM(...)/30*7 aplicadas a datos de 7 días.
 */
export function semanaTipica(totalEnReferencia: number, diasReferencia: number): number | null {
  return diasReferencia > 0 ? (totalEnReferencia / diasReferencia) * 7 : null
}
