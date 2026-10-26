import { describe, expect, it } from 'vitest'
import ic from '../../../tests/fixtures/informe-ejemplo.json'
import { generarInforme, ultimaMedicion, variacion, type ResultadoRed } from './informe'

// Datos de ejemplo de la plantilla IC 8857: "esta semana" (30 ago – 5 sep 2018) y "hace 1 semana" (23–29 ago)
const aResultado = (f: (typeof ic.estaSemana)[number], i: number, sem: string): ResultadoRed => ({
  publicacion_id: `${sem}-${i}`,
  publicacion_canal_id: `${sem}-${i}`,
  canal: 'X',
  marca_id: 'm',
  titulo: f.contenido,
  fecha: `${f.fecha}T12:00:00.000Z`,
  compartidos: f.compartidos,
  meGusta: f.meGusta,
  menciones: f.menciones,
  clics: f.clics,
  alcance: f.alcance,
})
const resultados = [...ic.estaSemana.map((f, i) => aResultado(f, i, 'a')), ...ic.semanaAnterior.map((f, i) => aResultado(f, i, 'b'))]
const DESDE = '2018-08-30T00:00:00.000Z'
const HASTA = '2018-09-06T00:00:00.000Z'

describe('Informe con los datos de la plantilla IC 8857 (fórmulas corregidas)', () => {
  const inf = generarInforme(resultados, DESDE, HASTA)

  it('periodo de 7 días con 10 publicaciones', () => {
    expect(inf.dias).toBe(7)
    expect(inf.actual.publicaciones).toBe(10)
    expect(inf.actual.publicacionesPorDia).toBeCloseTo(10 / 7, 10)
  })

  it('alcance total 10.000 (la plantilla mostraba 6.258, que era el compromiso)', () => {
    expect(inf.actual.totales.alcance).toBe(10000)
    expect(inf.actual.compromiso).toBe(6258)
  })

  it('compromiso promedio 625,8 (la plantilla mostraba 25,4 y 626,1)', () => {
    expect(inf.actual.promedioCompromiso).toBeCloseTo(625.8, 10)
    expect(inf.actual.promedioAlcance).toBe(1000)
    expect(inf.actual.tasaCompromiso).toBeCloseTo(0.6258, 10)
  })

  it('totales de compartidos, me gusta, menciones y clics', () => {
    expect(inf.actual.totales.compartidos).toBe(819)
    expect(inf.actual.totales.meGusta).toBe(1975)
    expect(inf.actual.totales.menciones).toBe(690)
    expect(inf.actual.totales.clics).toBe(2774)
  })

  it('compara con la semana anterior (mismos valores en el ejemplo = 0 %)', () => {
    expect(inf.anterior.publicaciones).toBe(10)
    expect(variacion(inf.actual.compromiso, inf.anterior.compromiso)).toBe(0)
  })

  it('semana típica = 30 días anteriores ÷ 30 × 7', () => {
    expect(inf.semanaTipica!.publicaciones).toBeCloseTo((10 / 30) * 7, 10)
    expect(inf.semanaTipica!.compromiso).toBeCloseTo((6258 / 30) * 7, 10) // 1.460,2
    expect(inf.semanaTipica!.totales.clics).toBeCloseTo((2774 / 30) * 7, 10)
  })

  it('top 5 por compromiso, calculado', () => {
    expect(inf.mejores.map((r) => r.titulo)).toEqual(['Contenido 6', 'Contenido 2', 'Contenido 7', 'Contenido 3', 'Contenido 1'])
  })

  it('resumen por red', () => {
    expect(inf.porRed).toHaveLength(1)
    expect(inf.porRed[0].canal).toBe('X')
    expect(inf.porRed[0].resumen.compromiso).toBe(6258)
  })
})

describe('Casos límite', () => {
  it('periodo sin datos: ceros y promedios vacíos, sin semana típica', () => {
    const inf = generarInforme([], DESDE, HASTA)
    expect(inf.actual.publicaciones).toBe(0)
    expect(inf.actual.promedioCompromiso).toBeNull()
    expect(inf.actual.tasaCompromiso).toBeNull()
    expect(inf.semanaTipica).toBeNull()
  })
  it('variación sin base es null', () => {
    expect(variacion(5, 0)).toBeNull()
    expect(variacion(150, 100)).toBeCloseTo(0.5, 10)
  })
  it('última medición por fecha', () => {
    expect(ultimaMedicion([{ medido_el: '2026-10-01' }, { medido_el: '2026-10-08' }, { medido_el: '2026-10-02' }])?.medido_el).toBe('2026-10-08')
    expect(ultimaMedicion([])).toBeNull()
  })
})
