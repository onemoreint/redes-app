/**
 * CSV compatible con Excel en español: separador punto y coma, BOM UTF-8 para que los acentos
 * se vean bien, comillas cuando hace falta y protección contra fórmulas (CSV injection):
 * un texto que empieza por = + - @ se antepone con un apóstrofo.
 */
export function celdaCSV(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'number') return Number.isFinite(v) ? String(v).replace('.', ',') : ''
  let s = String(v)
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function aCSV(encabezados: string[], filas: unknown[][]): string {
  return '﻿' + [encabezados, ...filas].map((f) => f.map(celdaCSV).join(';')).join('\r\n')
}

export function descargar(nombre: string, contenido: string, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
