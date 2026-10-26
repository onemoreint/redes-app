import { describe, expect, it } from 'vitest'
import {
  agruparPorDia,
  aInstante,
  diasDeSemana,
  filtrar,
  indiceDiaSemana,
  moverADia,
  partesLocales,
  rangoUTC,
  semanasDelMes,
  sumarDias,
  type PublicacionCalendario,
} from './calendario'

const BOG = 'America/Bogota'
const NY = 'America/New_York'

describe('Días y semanas', () => {
  it('suma días cruzando meses y años bisiestos', () => {
    expect(sumarDias('2026-12-31', 1)).toBe('2027-01-01')
    expect(sumarDias('2028-02-28', 1)).toBe('2028-02-29')
    expect(sumarDias('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('las semanas empiezan en lunes', () => {
    expect(indiceDiaSemana('2026-10-26')).toBe(0) // lunes
    expect(indiceDiaSemana('2026-10-25')).toBe(6) // domingo
    expect(diasDeSemana('2026-10-25')).toEqual([
      '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25',
    ])
  })

  it('el mes se cubre con semanas completas', () => {
    const feb = semanasDelMes(2026, 2) // 1 de febrero de 2026 es domingo
    expect(feb[0][0]).toBe('2026-01-26')
    expect(feb.at(-1)!.at(-1)).toBe('2026-03-01')
    expect(feb).toHaveLength(5)
    expect(semanasDelMes(2026, 6)[0][0]).toBe('2026-06-01') // empieza en lunes
  })
})

describe('Zona horaria', () => {
  it('convierte fecha y hora locales a UTC y de vuelta', () => {
    const iso = aInstante('2026-11-03', '23:30', BOG)
    expect(iso).toBe('2026-11-04T04:30:00.000Z')
    expect(partesLocales(iso, BOG)).toEqual({ dia: '2026-11-03', hora: '23:30' })
  })

  it('mover de día conserva la hora local, aun con cambio de horario de verano', () => {
    const antes = aInstante('2026-10-30', '14:00', NY) // horario de verano (UTC−4)
    const despues = moverADia(antes, '2026-11-02', NY) // horario estándar (UTC−5)
    expect(partesLocales(despues, NY)).toEqual({ dia: '2026-11-02', hora: '14:00' })
    expect(despues).toBe('2026-11-02T19:00:00.000Z')
  })

  it('rango de consulta cubre días locales completos', () => {
    expect(rangoUTC('2026-11-01', '2026-11-30', BOG)).toEqual({
      desde: '2026-11-01T05:00:00.000Z',
      hasta: '2026-12-01T05:00:00.000Z',
    })
  })
})

const base: PublicacionCalendario = {
  id: '',
  marca_id: 'm1',
  titulo: '',
  estado: 'borrador',
  fecha_prevista: null,
  responsable_id: null,
  categoria: '',
  texto: '',
  canales: [],
}
const p = (x: Partial<PublicacionCalendario>): PublicacionCalendario => ({ ...base, ...x })

describe('Agrupar y filtrar', () => {
  const lista = [
    p({ id: '1', titulo: 'Tarde', fecha_prevista: aInstante('2026-11-03', '18:00', BOG), canales: ['Instagram'], categoria: 'Video' }),
    p({ id: '2', titulo: 'Mañana', fecha_prevista: aInstante('2026-11-03', '08:00', BOG), canales: ['TikTok'], responsable_id: 'u1' }),
    p({ id: '3', titulo: 'Noche', fecha_prevista: aInstante('2026-11-03', '23:30', BOG), estado: 'publicado' }),
    p({ id: '4', titulo: 'Idea sin fecha', estado: 'idea', marca_id: 'm2' }),
    p({ id: '5', titulo: 'Vieja', fecha_prevista: aInstante('2026-10-01', '10:00', BOG), estado: 'programado', texto: 'Promo navidad' }),
  ]
  const ahora = new Date('2026-10-25T12:00:00Z')

  it('agrupa por día local, ordena por hora y omite las que no tienen fecha', () => {
    const g = agruparPorDia(lista, BOG)
    expect(g.get('2026-11-03')!.map((x) => x.id)).toEqual(['2', '1', '3']) // 23:30 Bogotá sigue siendo el día 3
    expect([...g.values()].flat().some((x) => x.id === '4')).toBe(false)
  })

  it('filtra por marca, canal, estado, responsable, categoría y texto', () => {
    const ids = (f: Parameters<typeof filtrar>[1]) => filtrar(lista, f, ahora).map((x) => x.id)
    expect(ids({ marca: 'm2' })).toEqual(['4'])
    expect(ids({ canal: 'Instagram' })).toEqual(['1'])
    expect(ids({ estado: 'publicado' })).toEqual(['3'])
    expect(ids({ estado: 'activas' })).toEqual(['1', '2', '4', '5'])
    expect(ids({ estado: 'atrasadas' })).toEqual(['5'])
    expect(ids({ responsable: 'u1' })).toEqual(['2'])
    expect(ids({ responsable: 'sin' })).toEqual(['1', '3', '4', '5'])
    expect(ids({ categoria: 'Video' })).toEqual(['1'])
    expect(ids({ texto: 'NAVIDAD' })).toEqual(['5'])
    expect(filtrar([...lista, p({ id: '6', campana_id: 'c1' })], { campana: 'c1' }, ahora).map((x) => x.id)).toEqual(['6'])
    expect(filtrar([...lista, p({ id: '6', campana_id: 'c1' })], { campana: 'sin' }, ahora)).toHaveLength(5)
    expect(ids({})).toHaveLength(5)
  })
})
