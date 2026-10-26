import { describe, expect, it } from 'vitest'
import { COMPETENCIA, EJECUTAR, INVESTIGAR, MEDIR, cambioObjetivo, objetivoVencido, progresoEstrategia, progresoSeccion } from './estrategia'

describe('Plan estratégico', () => {
  it('conserva todas las preguntas de la plantilla (7 + 6 + 6 casillas + 5)', () => {
    expect(INVESTIGAR).toHaveLength(7)
    expect(COMPETENCIA).toHaveLength(6)
    expect(EJECUTAR).toHaveLength(6)
    expect(MEDIR).toHaveLength(5)
  })

  it('estrategia vacía = 0 %', () => {
    expect(progresoEstrategia({}, 0)).toEqual({ completados: 0, total: 25, porcentaje: 0 })
  })

  it('cuenta textos con contenido, casillas marcadas y al menos un objetivo', () => {
    const p = progresoEstrategia({ mision: 'Inspirar', vision: '   ', check_grafica: true, check_informes: false }, 3)
    expect(p.completados).toBe(3) // misión + casilla + objetivos
    expect(p.porcentaje).toBe(12)
  })

  it('estrategia completa = 100 %', () => {
    const e: Record<string, string | boolean> = {}
    for (const q of [...INVESTIGAR, ...COMPETENCIA, ...MEDIR]) e[q.campo] = 'x'
    for (const c of EJECUTAR) e[c.campo] = true
    expect(progresoEstrategia(e, 1).porcentaje).toBe(100)
  })

  it('avance por sección', () => {
    expect(progresoSeccion({ mision: 'a', vision: 'b' }, INVESTIGAR)).toEqual({ completados: 2, total: 7, porcentaje: 29 })
  })
})

describe('Objetivos', () => {
  it('vencido solo si está activo y la fecha ya pasó', () => {
    expect(objetivoVencido({ estado: 'activo', fecha_limite: '2026-10-01' }, '2026-10-25')).toBe(true)
    expect(objetivoVencido({ estado: 'activo', fecha_limite: '2026-10-25' }, '2026-10-25')).toBe(false)
    expect(objetivoVencido({ estado: 'logrado', fecha_limite: '2026-10-01' }, '2026-10-25')).toBe(false)
    expect(objetivoVencido({ estado: 'activo', fecha_limite: null }, '2026-10-25')).toBe(false)
  })

  it('cambio pedido por el objetivo', () => {
    expect(cambioObjetivo({ valor_inicial: 1000, valor_meta: 1500 })).toEqual({ absoluto: 500, porcentaje: 0.5 })
    expect(cambioObjetivo({ valor_inicial: 0, valor_meta: 100 })).toEqual({ absoluto: 100, porcentaje: null })
    expect(cambioObjetivo({ valor_inicial: null, valor_meta: 100 })).toBeNull()
  })
})
