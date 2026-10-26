import { describe, expect, it } from 'vitest'
import { compararAuditoria } from './auditoria'

const r = (fecha: string, seguidores: number | null, trafico: number | null = null, clics: number | null = null, alcance: number | null = null) => ({
  fecha,
  seguidores,
  trafico_referencia: trafico,
  clics_por_publicacion: clics,
  alcance,
})

describe('Auditoría con historial (columnas calculadas de la plantilla)', () => {
  const historial = [
    r('2025-10-20', 500, 80),
    r('2026-09-20', 1000, 100, 10, 4000),
    r('2026-10-18', 1150, 110, 12, 5000),
    r('2026-10-25', 1200, 120, 15, 6000),
  ]
  const c = compararAuditoria(historial)!

  it('el registro actual es el más reciente', () => {
    expect(c.actual.fecha).toBe('2026-10-25')
  })
  it('seguidores vs. el mes pasado: cambio y %', () => {
    expect(c.seguidoresMes).toEqual({ base: '2026-09-20', cambio: 200, porcentaje: 0.2 })
  })
  it('clics por publicación vs. el mes pasado (M = K − L)', () => {
    expect(c.clicsMes.cambio).toBe(5)
    expect(c.clicsMes.porcentaje).toBeCloseTo(0.5, 10)
  })
  it('tráfico vs. el mes y el año pasados', () => {
    expect(c.traficoMes.cambio).toBe(20)
    expect(c.traficoAnio).toEqual({ base: '2025-10-20', cambio: 40, porcentaje: 0.5 })
  })
  it('alcance vs. la semana pasada', () => {
    expect(c.alcanceSemana.base).toBe('2026-10-18')
    expect(c.alcanceSemana.cambio).toBe(1000)
  })
  it('sin historial suficiente no inventa cambios', () => {
    const solo = compararAuditoria([r('2026-10-25', 1200)])!
    expect(solo.seguidoresMes).toEqual({ base: null, cambio: null, porcentaje: null })
    expect(compararAuditoria([])).toBeNull()
  })
  it('si falta el dato en la base, no hay cambio', () => {
    const x = compararAuditoria([r('2026-09-01', null), r('2026-10-25', 1200)])!
    expect(x.seguidoresMes.cambio).toBeNull()
  })
})
