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
