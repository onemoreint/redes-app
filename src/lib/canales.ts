/** Canales aprobados en la Etapa 2 (decisión 5). Los personalizados llegan con los perfiles (entrega 7). */
export const CANALES = [
  'Facebook',
  'Instagram',
  'TikTok',
  'YouTube',
  'LinkedIn',
  'X',
  'Pinterest',
  'Threads',
  'WhatsApp Business',
  'Blog',
] as const

export type Canal = (typeof CANALES)[number]

/**
 * Límite de caracteres del texto de una publicación, por red. Solo genera avisos; nunca bloquea.
 * Referencia: Buffer, "Character limits for each social network" (consultado el 2026-10-25).
 * X: 280 en cuentas gratuitas. Threads cuenta bytes UTF-8, así que acentos y emojis gastan más.
 */
export const LIMITE_CARACTERES: Partial<Record<string, number>> = {
  X: 280,
  Instagram: 2200,
  Facebook: 5000,
  LinkedIn: 3000,
  TikTok: 2200,
  Threads: 500,
  Pinterest: 500,
  YouTube: 5000,
}
