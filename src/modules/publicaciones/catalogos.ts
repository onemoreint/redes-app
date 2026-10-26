import type { Estado, Etapa } from '../../lib/calculos/publicaciones'

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

export const AYUDA_ESTADO: Record<Estado, string> = {
  idea: 'Solo el tema; aún sin fecha ni texto.',
  borrador: 'En preparación: texto, canales, fecha.',
  en_revision: 'Esperando que alguien la revise.',
  aprobado: 'Lista para publicar.',
  programado: 'Fecha y hora confirmadas. La app no publica sola: es un recordatorio.',
  publicado: 'Ya está en la red. Pega el enlace en cada canal.',
  en_pausa: 'Detenida por ahora; al reactivarla vuelve a su estado anterior.',
  descartado: 'No se publicará. No cuenta en el calendario ni en los indicadores.',
}

/** Colores de estado (texto + fondo), con contraste AA. */
export const COLOR_ESTADO: Record<Estado, string> = {
  idea: 'bg-violet-50 text-violet-800 border-violet-200',
  borrador: 'bg-stone-100 text-stone-700 border-stone-200',
  en_revision: 'bg-amber-50 text-amber-800 border-amber-200',
  aprobado: 'bg-sky-50 text-sky-800 border-sky-200',
  programado: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  publicado: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  en_pausa: 'bg-orange-50 text-orange-800 border-orange-200',
  descartado: 'bg-stone-50 text-stone-500 border-stone-200 line-through',
}

export const NOMBRE_ETAPA: Record<Etapa, string> = {
  conciencia: 'Conciencia',
  investigacion: 'Investigación',
  decision: 'Decisión',
  compra: 'Compra',
  retencion: 'Retención',
}

/** Tipos de contenido: los de la plantilla 6 (texto, imagen, video) más los formatos actuales. */
export const TIPOS = ['Texto', 'Imagen', 'Carrusel', 'Video', 'Reel', 'Historia', 'En vivo', 'Artículo'] as const

/** Categorías sugeridas (de la plantilla 4); se puede escribir cualquier otra. */
export const CATEGORIAS_SUGERIDAS = ['Libro electrónico', 'Concurso / regalo', 'Lanzamiento de producto', 'Video', 'Infografía', 'Educativo', 'Testimonio', 'Promoción']
