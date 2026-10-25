import { formatInTimeZone } from 'date-fns-tz'

/** Estados aprobados en la Etapa 2 (decisión 3). "Atrasada" se calcula, no se elige. */
export const ESTADOS = [
  'idea',
  'borrador',
  'en_revision',
  'aprobado',
  'programado',
  'publicado',
  'en_pausa',
  'descartado',
] as const
export type Estado = (typeof ESTADOS)[number]

export const NOMBRE_ESTADO: Record<Estado, string> = {
  idea: 'Idea',
  borrador: 'Borrador',
  en_revision: 'En revisión',
  aprobado: 'Aprobado',
  programado: 'Programado',
  publicado: 'Publicado',
  en_pausa: 'En pausa',
  descartado: 'Descartado',
}

/** Etapas del embudo aprobadas en la Etapa 2 (decisión 4). */
export const ETAPAS = ['conciencia', 'investigacion', 'decision', 'compra', 'retencion'] as const
export type Etapa = (typeof ETAPAS)[number]

const ESTADOS_CON_ALERTA: Estado[] = ['borrador', 'en_revision', 'aprobado', 'programado']

/**
 * Atrasada: tenía fecha prevista, la fecha ya pasó y no se publicó ni se descartó.
 * Sustituye al estado manual "Atrasado" de la plantilla de plan de contenido.
 */
export function estaAtrasada(p: { estado: Estado; fechaPrevista: string | null }, ahora: Date): boolean {
  if (!p.fechaPrevista || !ESTADOS_CON_ALERTA.includes(p.estado)) return false
  return new Date(p.fechaPrevista).getTime() < ahora.getTime()
}

/**
 * Número de caracteres del texto más los hashtags.
 * En las plantillas se escribía a mano ("Recuento de personajes" / "CARBONIZARSE. CONTAR").
 * Cuenta caracteres visibles (un emoji = 1), no unidades de código.
 */
export function contarCaracteres(texto: string | null | undefined, hashtags?: string | null): number {
  const partes = [texto ?? '', hashtags ?? ''].filter((s) => s.trim().length > 0)
  const unido = partes.join(' ')
  const seg = new Intl.Segmenter('es', { granularity: 'grapheme' })
  return Array.from(seg.segment(unido)).length
}

export function excedeLimite(caracteres: number, limite: number | null | undefined): boolean {
  return limite != null && limite > 0 && caracteres > limite
}

/** Día del calendario (YYYY-MM-DD) en la zona horaria del espacio de trabajo. */
export function diaLocal(fechaISO: string, zonaHoraria: string): string {
  return formatInTimeZone(new Date(fechaISO), zonaHoraria, 'yyyy-MM-dd')
}
