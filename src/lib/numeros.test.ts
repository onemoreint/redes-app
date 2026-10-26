import { describe, expect, it } from 'vitest'
import { aNumero } from './numeros'

describe('aNumero', () => {
  it('acepta separador de miles con punto y decimales con coma', () => {
    expect(aNumero('1.500')).toBe(1500)
    expect(aNumero('1.500.000')).toBe(1500000)
    expect(aNumero('1500,5')).toBe(1500.5)
    expect(aNumero('1.500,25')).toBe(1500.25)
    expect(aNumero(' 2 000 ')).toBe(2000)
  })
  it('un punto que no separa miles es decimal', () => {
    expect(aNumero('1.5')).toBe(1.5)
  })
  it('vacío es null y texto inválido es NaN', () => {
    expect(aNumero('')).toBeNull()
    expect(aNumero('   ')).toBeNull()
    expect(aNumero('mil')).toBeNaN()
    expect(aNumero('12abc')).toBeNaN()
  })
})
