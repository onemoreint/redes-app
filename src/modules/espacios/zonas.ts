/** Zonas horarias disponibles en el navegador, con las de Latinoamérica primero. */
const PRIORITARIAS = [
  'America/Bogota',
  'America/Caracas',
  'America/Mexico_City',
  'America/Lima',
  'America/Guayaquil',
  'America/Santiago',
  'America/Argentina/Buenos_Aires',
  'America/Panama',
  'America/Santo_Domingo',
  'America/New_York',
  'Europe/Madrid',
]

export function zonasHorarias(): string[] {
  let todas: string[] = []
  try {
    todas = Intl.supportedValuesOf('timeZone')
  } catch {
    todas = []
  }
  const resto = todas.filter((z) => !PRIORITARIAS.includes(z))
  return [...PRIORITARIAS, ...resto]
}

export function zonaDelNavegador(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota'
  } catch {
    return 'America/Bogota'
  }
}
