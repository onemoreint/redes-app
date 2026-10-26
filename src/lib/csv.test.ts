import { describe, expect, it } from 'vitest'
import { aCSV, celdaCSV } from './csv'

describe('CSV para Excel en español', () => {
  it('números con coma decimal y vacíos', () => {
    expect(celdaCSV(625.8)).toBe('625,8')
    expect(celdaCSV(null)).toBe('')
    expect(celdaCSV(Number.NaN)).toBe('')
  })
  it('entrecomilla separadores, comillas y saltos de línea', () => {
    expect(celdaCSV('a;b')).toBe('"a;b"')
    expect(celdaCSV('dijo "hola"')).toBe('"dijo ""hola"""')
    expect(celdaCSV('línea 1\nlínea 2')).toBe('"línea 1\nlínea 2"')
  })
  it('neutraliza fórmulas', () => {
    expect(celdaCSV('=SUMA(A1)')).toBe("'=SUMA(A1)")
    expect(celdaCSV('+57 312')).toBe("'+57 312")
  })
  it('arma el archivo con BOM y filas', () => {
    expect(aCSV(['A', 'B'], [[1, 'x']])).toBe('﻿A;B\r\n1;x')
  })
})
