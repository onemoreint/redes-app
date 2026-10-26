import { describe, expect, it } from 'vitest'
import tablero from '../../../tests/fixtures/tablero-ejemplo.json'
import { cumplimiento, porSemanaYDia, porSemanaYTipo, type PublicacionParaTablero } from './tablero'
import { semanasDelMes } from './calendario'

const DIAS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO']
const ZONA = 'America/Bogota'
// Las semanas 1–4 del Excel se colocan del lunes 5 al domingo 25 de enero... y la 4 hasta el 1 de febrero
const pubs: PublicacionParaTablero[] = tablero.filas.map((f) => ({
  fecha: new Date(Date.UTC(2026, 0, 5 + (f.semana - 1) * 7 + DIAS.indexOf(f.dia), 17)).toISOString(),
  tipos: f.tipos,
  canales: f.canales,
  caracteres: f.caracteres,
}))

describe('Tablero mensual con fechas reales', () => {
  it('reproduce los conteos semana × día del Excel en el mes de enero de 2026', () => {
    const semanas = semanasDelMes(2026, 1) // empieza el lunes 29 de diciembre
    const filas = porSemanaYDia(pubs, semanas, ZONA)
    expect(filas[0]).toEqual({ lunes: '2025-12-29', dias: [0, 0, 0, 0, 0, 0, 0], total: 0 })
    expect(filas[1].dias).toEqual([3, 3, 3, 2, 3, 1, 1]) // Wk1 = 16
    expect(filas[1].total).toBe(16)
    expect(filas[2].dias).toEqual([4, 4, 4, 2, 3, 1, 2]) // Wk2 = 20
    expect(filas[3].dias).toEqual([3, 4, 4, 1, 1, 3, 4]) // Wk3 = 20
    expect(filas[4].dias).toEqual([3, 6, 4, 1, 1, 1, 4]) // Wk4 = 20
    expect(filas.reduce((s, f) => s + f.total, 0)).toBe(76)
  })

  it('reproduce el contenido por tipo y semana', () => {
    const t = porSemanaYTipo(pubs, semanasDelMes(2026, 1), ['texto', 'imagen', 'video'], ZONA)
    expect(t[1]).toEqual([4, 8, 6])
    expect(t[2]).toEqual([0, 0, 0])
  })

  it('ignora publicaciones fuera de las semanas pedidas', () => {
    const filas = porSemanaYDia(pubs, semanasDelMes(2026, 3), ZONA)
    expect(filas.reduce((s, f) => s + f.total, 0)).toBe(0)
  })
})

describe('Cumplimiento del calendario', () => {
  const ahora = new Date('2026-10-25T12:00:00Z')
  it('publicadas ÷ debidas, sin descartadas ni futuras', () => {
    const r = cumplimiento(
      [
        { estado: 'publicado', fecha_prevista: '2026-10-20T12:00:00Z' },
        { estado: 'programado', fecha_prevista: '2026-10-21T12:00:00Z' },
        { estado: 'publicado', fecha_prevista: '2026-10-22T12:00:00Z' },
        { estado: 'descartado', fecha_prevista: '2026-10-22T12:00:00Z' },
        { estado: 'borrador', fecha_prevista: '2026-10-30T12:00:00Z' },
        { estado: 'idea', fecha_prevista: null },
      ],
      ahora,
    )
    expect(r).toEqual({ publicadas: 2, debidas: 3, porcentaje: 67 })
  })
  it('sin nada debido no inventa un porcentaje', () => {
    expect(cumplimiento([], ahora).porcentaje).toBeNull()
  })
})
