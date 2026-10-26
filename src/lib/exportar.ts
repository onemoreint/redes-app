import { aCSV, descargar } from './csv'

export type Formato = 'csv' | 'xlsx'
type Valor = string | number | Date | null | undefined

/** Descarga una tabla como CSV (separador ;) o Excel (.xlsx). nombreBase va sin extensión. */
export async function exportarTabla(formato: Formato, nombreBase: string, encabezados: string[], filas: Valor[][], hoja = 'Datos') {
  if (formato === 'csv') return descargar(`${nombreBase}.csv`, aCSV(encabezados, filas))
  const { descargarXlsx } = await import('./excel')
  await descargarXlsx(nombreBase, [{ nombre: hoja, encabezados, filas }])
}
