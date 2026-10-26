/**
 * Lectura y escritura de .xlsx con ExcelJS. La librería se carga solo cuando se usa
 * (import dinámico) para no engordar la carga inicial de la app.
 */
import type { Celda, Tabla } from './importar'

type ValorExcel = unknown

/** Convierte el valor de una celda de ExcelJS (texto enriquecido, fórmula, enlace…) en un valor simple. */
export function valorSimple(v: ValorExcel): Celda {
  if (v == null || v === '') return null
  if (v instanceof Date || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    if (Array.isArray(o.richText)) return (o.richText as { text: string }[]).map((t) => t.text).join('')
    if ('result' in o) return valorSimple(o.result) // fórmula: se usa el último resultado guardado
    if ('formula' in o || 'sharedFormula' in o) return null // fórmula sin resultado calculado
    if ('text' in o) return valorSimple(o.text) // hipervínculo
    if ('error' in o) return null // #N/A, #DIV/0!…
  }
  return String(v)
}

/** Lee todas las hojas visibles de un .xlsx. Filas y columnas empiezan en 0. */
export async function leerXlsx(datos: ArrayBuffer): Promise<Tabla[]> {
  const { default: ExcelJS } = await import('exceljs')
  const libro = new ExcelJS.Workbook()
  await libro.xlsx.load(datos)
  const tablas: Tabla[] = []
  libro.eachSheet((hoja) => {
    if (hoja.state && hoja.state !== 'visible') return
    const filas: Celda[][] = []
    hoja.eachRow({ includeEmpty: true }, (fila, n) => {
      const valores: Celda[] = []
      fila.eachCell({ includeEmpty: true }, (celda, col) => {
        valores[col - 1] = valorSimple(celda.value)
      })
      filas[n - 1] = Array.from(valores, (x) => x ?? null)
    })
    tablas.push({ hoja: hoja.name, filas: Array.from(filas, (x) => x ?? []) })
  })
  return tablas
}

export interface HojaExportar {
  nombre: string
  encabezados: string[]
  filas: (string | number | Date | null | undefined)[][]
}

/** Neutraliza textos que Excel interpretaría como fórmula (=, +, -, @). */
const seguro = (v: string | number | Date | null | undefined) =>
  typeof v === 'string' && /^[=+\-@\t\r]/.test(v) ? `'${v}` : (v ?? null)

export async function crearXlsx(hojas: HojaExportar[]): Promise<Blob> {
  const { default: ExcelJS } = await import('exceljs')
  const libro = new ExcelJS.Workbook()
  libro.creator = 'redes-app'
  libro.created = new Date()
  for (const h of hojas) {
    const hoja = libro.addWorksheet(h.nombre.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Hoja')
    hoja.addRow(h.encabezados)
    hoja.getRow(1).font = { bold: true }
    hoja.views = [{ state: 'frozen', ySplit: 1 }]
    for (const f of h.filas) hoja.addRow(f.map(seguro))
    hoja.columns.forEach((c, i) => {
      const largo = Math.max(h.encabezados[i]?.length ?? 8, ...h.filas.slice(0, 200).map((f) => String(f[i] ?? '').length))
      c.width = Math.min(60, Math.max(10, largo + 2))
      if (h.filas.some((f) => f[i] instanceof Date)) c.numFmt = 'dd/mm/yyyy hh:mm'
    })
  }
  const buffer = await libro.xlsx.writeBuffer()
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export async function descargarXlsx(nombre: string, hojas: HojaExportar[]) {
  const blob = await crearXlsx(hojas)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre.endsWith('.xlsx') ? nombre : `${nombre}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
