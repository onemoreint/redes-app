/**
 * Cálculos migrados desde "Auditoría de redes sociales.xlsx".
 *   M = K - L  (clics por publicación: cambio frente al mes pasado)
 *   R = P - Q  (seguidores: cambio frente al mes pasado)
 * En Excel los "% de cambio" se escribían a mano; aquí se calculan.
 */

export function cambio(actual: number | null | undefined, anterior: number | null | undefined): number | null {
  if (actual == null || anterior == null) return null
  return actual - anterior
}

/** (actual − anterior) ÷ anterior. null si falta un dato o el anterior es 0. */
export function cambioPorcentual(actual: number | null | undefined, anterior: number | null | undefined): number | null {
  if (actual == null || anterior == null || anterior === 0) return null
  return (actual - anterior) / anterior
}

export interface RegistroConFecha {
  fecha: string // YYYY-MM-DD
}

/**
 * Registro de referencia para comparar: el más reciente con fecha
 * igual o anterior a `fechaObjetivo`. Sirve para "el mes pasado", "la semana pasada", etc.
 */
export function registroMasCercanoAntesDe<T extends RegistroConFecha>(registros: T[], fechaObjetivo: string): T | null {
  let mejor: T | null = null
  for (const r of registros) {
    if (r.fecha <= fechaObjetivo && (!mejor || r.fecha > mejor.fecha)) mejor = r
  }
  return mejor
}
