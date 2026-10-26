import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { crearXlsx, leerXlsx, valorSimple } from './excel'

describe('Excel', () => {
  it('convierte valores especiales de celda', () => {
    expect(valorSimple({ richText: [{ text: 'Hola ' }, { text: 'mundo' }] })).toBe('Hola mundo')
    expect(valorSimple({ formula: 'A1+B1', result: 7 })).toBe(7)
    expect(valorSimple({ formula: 'A1+B1' })).toBeNull()
    expect(valorSimple({ text: 'enlace', hyperlink: 'https://x.y' })).toBe('enlace')
    expect(valorSimple({ error: '#N/A' })).toBeNull()
  })

  it('lee un libro como el de las plantillas: título arriba, hojas ocultas fuera, celdas vacías conservadas', async () => {
    const libro = new ExcelJS.Workbook()
    const h = libro.addWorksheet('Horario')
    h.getCell('B1').value = 'Plantilla de horario'
    h.getRow(2).values = ['', 'FECHA', 'Temas', 'FACEBOOK']
    h.getRow(3).values = ['', new Date(Date.UTC(2026, 10, 3)), { richText: [{ text: 'Guía' }] }, 'x']
    h.getCell('E3').value = { formula: 'LEN(C3)', result: 4 }
    const oculta = libro.addWorksheet('Datos')
    oculta.state = 'hidden'
    oculta.getCell('A1').value = 'no'
    const buf = await libro.xlsx.writeBuffer()
    const tablas = await leerXlsx(buf as ArrayBuffer)
    expect(tablas.map((t) => t.hoja)).toEqual(['Horario'])
    expect(tablas[0].filas[0]).toEqual([null, 'Plantilla de horario'])
    expect(tablas[0].filas[1]).toEqual([null, 'FECHA', 'Temas', 'FACEBOOK'])
    expect(tablas[0].filas[2]).toEqual([null, new Date(Date.UTC(2026, 10, 3)), 'Guía', 'x', 4])
  })

  it('exporta y se vuelve a leer igual; neutraliza fórmulas', async () => {
    const blob = await crearXlsx([
      { nombre: 'Publicaciones / mes', encabezados: ['Título', 'Seguidores', 'Fecha'], filas: [['=HACK()', 12, new Date(Date.UTC(2026, 0, 2))], ['Normal', null, null]] },
    ])
    const tablas = await leerXlsx(await blob.arrayBuffer())
    expect(tablas[0].hoja).toBe('Publicaciones   mes')
    expect(tablas[0].filas[1]).toEqual(["'=HACK()", 12, new Date(Date.UTC(2026, 0, 2))])
    expect(tablas[0].filas[2][0]).toBe('Normal')
  })
})
