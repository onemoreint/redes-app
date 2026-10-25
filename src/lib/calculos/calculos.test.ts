import { describe, expect, it } from 'vitest'
import informe from '../../../tests/fixtures/informe-ejemplo.json'
import tablero from '../../../tests/fixtures/tablero-ejemplo.json'
import {
  compromiso,
  mejores,
  promedio,
  promedioCompromiso,
  publicacionesPorDia,
  semanaTipica,
  tasaCompromiso,
  total,
  totalCompromiso,
} from './metricas'
import { cambio, cambioPorcentual, registroMasCercanoAntesDe } from './auditoria'
import { contarCaracteres, diaLocal, estaAtrasada, excedeLimite } from './publicaciones'
import { porCanal, porDiaDeSemana, porTipo, promedioCaracteres, type PublicacionParaTablero } from './tablero'

const semana = informe.estaSemana
const anterior = informe.semanaAnterior

describe('Informe de redes (plantilla IC 8857), datos de ejemplo', () => {
  it('compromiso por publicación = fórmula original del Excel (I8 = SUM(D8:G8))', () => {
    expect(compromiso(semana[0])).toBe(511)
    // La columna Q (hace 1 semana) traía valores fijos; deben coincidir con el cálculo
    expect(anterior.map(compromiso)).toEqual([511, 1000, 627, 440, 337, 442, 654, 1263, 485, 499])
  })

  it('cuenta las publicaciones de la semana (D6)', () => {
    expect(semana.length).toBe(10)
  })

  it('alcance total suma el alcance, no el compromiso (corrige B6: mostraba 6.258)', () => {
    expect(total(semana, 'alcance')).toBe(10000)
    expect(totalCompromiso(semana)).toBe(6258)
  })

  it('compromiso promedio por publicación = 625,8 (corrige F8: 25,4 y Y4: 626,1)', () => {
    expect(promedioCompromiso(semana)).toBeCloseTo(625.8, 10)
  })

  it('totales y promedios de compartidos, me gusta, menciones y clics', () => {
    expect(total(semana, 'compartidos')).toBe(819) // D8
    expect(promedio(semana, 'compartidos')).toBeCloseTo(81.9, 10) // F6
    expect(total(semana, 'meGusta')).toBe(1975) // I6
    expect(total(semana, 'menciones')).toBe(690) // I8
    expect(promedio(semana, 'clics')).toBeCloseTo(277.4, 10) // B34
  })

  it('top 5 por compromiso, de mayor a menor', () => {
    expect(mejores(semana, 5).map((p) => p.contenido)).toEqual([
      'Contenido 6',
      'Contenido 2',
      'Contenido 7',
      'Contenido 3',
      'Contenido 1',
    ])
  })

  it('publicaciones por día usa los días reales del periodo (corrige S4 = COUNT/30)', () => {
    expect(publicacionesPorDia(10, 7)).toBeCloseTo(10 / 7, 10)
    expect(publicacionesPorDia(10, 0)).toBeNull()
  })

  it('semana típica = promedio semanal del periodo de referencia', () => {
    expect(semanaTipica(30, 30)).toBe(7)
    expect(semanaTipica(100, 0)).toBeNull()
  })

  it('tasa de compromiso; sin alcance no divide entre cero', () => {
    expect(tasaCompromiso({ alcance: 1000, meGusta: 50, clics: 50 })).toBeCloseTo(0.1, 10)
    expect(tasaCompromiso({ alcance: 0, meGusta: 5 })).toBeNull()
  })

  it('promedio de una lista vacía es null, no 0', () => {
    expect(promedioCompromiso([])).toBeNull()
  })

  it('suma comentarios y guardados (cambio aprobado) y trata vacíos como 0', () => {
    expect(compromiso({ meGusta: 1, comentarios: 2, guardados: 3, compartidos: null })).toBe(6)
  })
})

describe('Auditoría de redes', () => {
  it('cambio = actual − anterior (M = K − L, R = P − Q)', () => {
    expect(cambio(1200, 1000)).toBe(200)
    expect(cambio(null, 1000)).toBeNull()
  })
  it('cambio porcentual calculado; anterior 0 no divide', () => {
    expect(cambioPorcentual(1200, 1000)).toBeCloseTo(0.2, 10)
    expect(cambioPorcentual(10, 0)).toBeNull()
  })
  it('elige el registro más reciente anterior a la fecha', () => {
    const r = [{ fecha: '2026-08-01' }, { fecha: '2026-09-01' }, { fecha: '2026-10-01' }]
    expect(registroMasCercanoAntesDe(r, '2026-09-25')?.fecha).toBe('2026-09-01')
    expect(registroMasCercanoAntesDe(r, '2026-07-01')).toBeNull()
  })
})

describe('Plan de publicación con tablero, datos de ejemplo', () => {
  const DIAS = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO']
  const ZONA = 'America/Bogota'
  // Semana 1 empieza el lunes 2026-01-05; mediodía en Bogotá
  const fecha = (semana: number, dia: string) => {
    const d = new Date(Date.UTC(2026, 0, 5 + (semana - 1) * 7 + DIAS.indexOf(dia), 17, 0))
    return d.toISOString()
  }
  const pubs: (PublicacionParaTablero & { semana: number })[] = tablero.filas.map((f) => ({
    semana: f.semana,
    fecha: fecha(f.semana, f.dia),
    tipos: f.tipos,
    canales: f.canales,
    caracteres: f.caracteres,
  }))
  const deSemana = (s: number) => pubs.filter((p) => p.semana === s)

  it('publicaciones por día de la semana (C4:J7)', () => {
    expect(porDiaDeSemana(deSemana(1), ZONA)).toEqual([3, 3, 3, 2, 3, 1, 1])
    expect(porDiaDeSemana(deSemana(2), ZONA)).toEqual([4, 4, 4, 2, 3, 1, 2])
    expect(porDiaDeSemana(deSemana(3), ZONA)).toEqual([3, 4, 4, 1, 1, 3, 4])
    expect(porDiaDeSemana(deSemana(4), ZONA)).toEqual([3, 6, 4, 1, 1, 1, 4])
  })

  it('contenido por tipo y semana (L4:N7)', () => {
    expect(porTipo(deSemana(1), ['texto', 'imagen', 'video'])).toEqual([4, 8, 6])
    expect(porTipo(deSemana(2), ['texto', 'imagen', 'video'])).toEqual([0, 0, 0])
  })

  it('total por canal (Q8:AC8)', () => {
    expect(porCanal(pubs, tablero.canales)).toEqual([16, 6, 8, 8, 7, 13, 9, 11, 6, 9, 3, 7, 2])
  })

  it('promedio de caracteres (P6)', () => {
    expect(promedioCaracteres(pubs)).toBeCloseTo(572.3125, 10)
  })
})

describe('Publicaciones', () => {
  const ahora = new Date('2026-10-25T12:00:00Z')
  it('atrasada solo si la fecha pasó y no está publicada ni descartada', () => {
    expect(estaAtrasada({ estado: 'programado', fechaPrevista: '2026-10-24T12:00:00Z' }, ahora)).toBe(true)
    expect(estaAtrasada({ estado: 'publicado', fechaPrevista: '2026-10-24T12:00:00Z' }, ahora)).toBe(false)
    expect(estaAtrasada({ estado: 'descartado', fechaPrevista: '2026-10-24T12:00:00Z' }, ahora)).toBe(false)
    expect(estaAtrasada({ estado: 'idea', fechaPrevista: null }, ahora)).toBe(false)
    expect(estaAtrasada({ estado: 'borrador', fechaPrevista: '2026-10-26T12:00:00Z' }, ahora)).toBe(false)
  })

  it('cuenta caracteres visibles de texto + hashtags (un emoji = 1)', () => {
    expect(contarCaracteres('Hola 👋', '#redes')).toBe(13)
    expect(contarCaracteres('', null)).toBe(0)
  })

  it('aviso de límite por canal', () => {
    expect(excedeLimite(281, 280)).toBe(true)
    expect(excedeLimite(280, 280)).toBe(false)
    expect(excedeLimite(5000, null)).toBe(false)
  })

  it('23:30 en Bogotá cae en el día local correcto aunque en UTC ya sea el día siguiente', () => {
    expect(diaLocal('2026-03-11T04:30:00Z', 'America/Bogota')).toBe('2026-03-10')
    expect(diaLocal('2026-03-11T04:30:00Z', 'UTC')).toBe('2026-03-11')
  })
})
