/**
 * Convierte texto escrito a mano en número, aceptando formato latinoamericano:
 * "1.500" -> 1500, "1500,5" -> 1500.5, "1.500,25" -> 1500.25, "1.5" -> 1.5.
 * Vacío -> null. Texto que no es número -> NaN (para mostrar un error).
 */
export function aNumero(v: string): number | null {
  const t = v.trim()
  if (!t) return null
  const normal = t
    .replace(/\s/g, '')
    .replace(/\.(?=\d{3}(\D|$))/g, '')
    .replace(',', '.')
  if (!/^-?\d+(\.\d+)?$/.test(normal)) return NaN
  return Number(normal)
}
