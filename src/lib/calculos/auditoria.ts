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

export interface RegistroComparable extends RegistroConFecha {
  seguidores: number | null
  trafico_referencia: number | null
  clics_por_publicacion: number | null
  alcance: number | null
}

const restarDias = (d: string, n: number) => {
  const f = new Date(`${d}T00:00:00Z`)
  f.setUTCDate(f.getUTCDate() - n)
  return f.toISOString().slice(0, 10)
}

export interface Comparacion {
  base: string | null // fecha del registro con que se compara
  cambio: number | null
  porcentaje: number | null
}

const comparar = (actual: number | null, base: { fecha: string; valor: number | null } | null): Comparacion => ({
  base: base?.fecha ?? null,
  cambio: base ? cambio(actual, base.valor) : null,
  porcentaje: base ? cambioPorcentual(actual, base.valor) : null,
})

/**
 * Columnas calculadas de la plantilla de auditoría, a partir del historial de un perfil:
 *   seguidores vs. el mes pasado (R = P − Q y su %), clics por publicación vs. el mes pasado (M = K − L),
 *   tráfico de referencia vs. el mes y el año pasados, alcance vs. la semana pasada.
 * "El mes pasado" = el registro más reciente con fecha de al menos 30 días antes; semana = 7; año = 365.
 */
export function compararAuditoria<T extends RegistroComparable>(registros: T[]) {
  if (registros.length === 0) return null
  const ordenados = [...registros].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const actual = ordenados.at(-1)!
  const previos = ordenados.slice(0, -1)
  const base = (dias: number, campo: keyof RegistroComparable) => {
    const r = registroMasCercanoAntesDe(previos, restarDias(actual.fecha, dias))
    return r ? { fecha: r.fecha, valor: r[campo] as number | null } : null
  }
  return {
    actual,
    seguidoresMes: comparar(actual.seguidores, base(30, 'seguidores')),
    clicsMes: comparar(actual.clics_por_publicacion, base(30, 'clics_por_publicacion')),
    traficoMes: comparar(actual.trafico_referencia, base(30, 'trafico_referencia')),
    traficoAnio: comparar(actual.trafico_referencia, base(365, 'trafico_referencia')),
    alcanceSemana: comparar(actual.alcance, base(7, 'alcance')),
  }
}
