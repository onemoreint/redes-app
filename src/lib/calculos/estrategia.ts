/**
 * Estructura del "Plan estratégico de redes sociales" (plantilla 1) y cálculos sobre ella.
 * Las preguntas conservan el orden y sentido de la plantilla; se corrigió la traducción
 * automática ("GORJEO" -> X, etc.).
 */

export type CampoTexto =
  | 'empresa'
  | 'mision'
  | 'vision'
  | 'publico'
  | 'mensaje'
  | 'fortalezas'
  | 'debilidades'
  | 'competencia'
  | 'fortalezas_competencia'
  | 'ventaja'
  | 'diferenciacion'
  | 'obstaculos'
  | 'beneficios'
  | 'medir_estado_semanal'
  | 'medir_crecimiento'
  | 'medir_compromiso'
  | 'medir_influencia'
  | 'evaluacion'

export type CampoCheck =
  | 'check_mensaje'
  | 'check_grafica'
  | 'check_monitoreo'
  | 'check_id_social'
  | 'check_publicacion_diaria'
  | 'check_informes'

export interface Pregunta {
  campo: CampoTexto
  etiqueta: string
  ayuda: string
}

export const INVESTIGAR: Pregunta[] = [
  { campo: 'empresa', etiqueta: 'La empresa o marca', ayuda: 'Qué hace, qué vende y desde cuándo.' },
  { campo: 'mision', etiqueta: 'Misión', ayuda: 'Para qué existe la marca hoy.' },
  { campo: 'vision', etiqueta: 'Visión', ayuda: 'Hacia dónde quiere llegar.' },
  { campo: 'publico', etiqueta: 'Público objetivo', ayuda: 'Quién te compra o te sigue: edad, lugar, intereses, problemas.' },
  { campo: 'mensaje', etiqueta: 'Tu mensaje', ayuda: 'La idea central que quieres que recuerden.' },
  { campo: 'fortalezas', etiqueta: 'Fortalezas', ayuda: 'Lo que la marca hace bien.' },
  { campo: 'debilidades', etiqueta: 'Debilidades', ayuda: 'Lo que hay que mejorar.' },
]

export const COMPETENCIA: Pregunta[] = [
  { campo: 'competencia', etiqueta: 'Competencia', ayuda: 'Quiénes compiten por la misma atención o clientes.' },
  { campo: 'fortalezas_competencia', etiqueta: 'Fortalezas de la competencia', ayuda: 'Qué hacen bien en redes.' },
  { campo: 'ventaja', etiqueta: 'Tu ventaja competitiva', ayuda: 'Lo que tu marca hace mejor.' },
  { campo: 'diferenciacion', etiqueta: 'Qué puedes hacer diferente', ayuda: 'Huecos que la competencia no cubre.' },
  { campo: 'obstaculos', etiqueta: 'Posibles obstáculos', ayuda: 'Tiempo, presupuesto, equipo, temporada…' },
  { campo: 'beneficios', etiqueta: 'Beneficios', ayuda: 'Qué gana la marca si el plan funciona.' },
]

export const EJECUTAR: { campo: CampoCheck; etiqueta: string }[] = [
  { campo: 'check_mensaje', etiqueta: 'El mensaje es claro y uniforme en todas las plataformas' },
  { campo: 'check_grafica', etiqueta: 'La imagen gráfica es uniforme' },
  { campo: 'check_monitoreo', etiqueta: 'Se monitorea la conversación sobre la marca' },
  { campo: 'check_id_social', etiqueta: 'Las redes aparecen en todo: correo, impresos, web' },
  { campo: 'check_publicacion_diaria', etiqueta: 'Se publica a diario donde corresponde' },
  { campo: 'check_informes', etiqueta: 'Hay un plan de informes: compromiso, influencia, números' },
]

export const MEDIR: Pregunta[] = [
  { campo: 'medir_estado_semanal', etiqueta: 'Actualizaciones de estado semanales', ayuda: 'Qué se revisa cada semana y quién lo hace.' },
  { campo: 'medir_crecimiento', etiqueta: 'Crecimiento de seguidores y comunidad', ayuda: 'Cómo va el número de seguidores por red.' },
  { campo: 'medir_compromiso', etiqueta: 'Estado del compromiso', ayuda: 'Me gusta, comentarios, compartidos: ¿suben o bajan?' },
  { campo: 'medir_influencia', etiqueta: 'Estado de la influencia', ayuda: 'Menciones, alcance, quién habla de la marca.' },
  { campo: 'evaluacion', etiqueta: '¿Qué funciona y qué no?', ayuda: 'Conclusiones y cambios para el próximo periodo.' },
]

export type DatosEstrategia = Record<CampoTexto, string> & Record<CampoCheck, boolean>

export interface Progreso {
  completados: number
  total: number
  porcentaje: number // 0–100, entero
}

/**
 * Avance de la estrategia: cada respuesta de texto no vacía y cada casilla marcada
 * cuenta como un punto. Los objetivos se cuentan aparte (al menos uno = un punto).
 */
export function progresoEstrategia(e: Partial<DatosEstrategia>, cantidadObjetivos: number): Progreso {
  const textos = [...INVESTIGAR, ...COMPETENCIA, ...MEDIR].map((p) => p.campo)
  const checks = EJECUTAR.map((c) => c.campo)
  const completados =
    textos.filter((c) => (e[c] ?? '').trim().length > 0).length + checks.filter((c) => e[c] === true).length + (cantidadObjetivos > 0 ? 1 : 0)
  const total = textos.length + checks.length + 1
  return { completados, total, porcentaje: Math.round((completados / total) * 100) }
}

export function progresoSeccion(e: Partial<DatosEstrategia>, preguntas: Pregunta[]): Progreso {
  const completados = preguntas.filter((p) => (e[p.campo] ?? '').trim().length > 0).length
  return { completados, total: preguntas.length, porcentaje: Math.round((completados / preguntas.length) * 100) }
}

/** Un objetivo activo cuya fecha límite ya pasó (fecha en YYYY-MM-DD del espacio). */
export function objetivoVencido(o: { estado: string; fecha_limite: string | null }, hoy: string): boolean {
  return o.estado === 'activo' && o.fecha_limite != null && o.fecha_limite < hoy
}

/** Cambio que pide el objetivo, en número y en % sobre el valor inicial. */
export function cambioObjetivo(o: { valor_inicial: number | null; valor_meta: number | null }): { absoluto: number; porcentaje: number | null } | null {
  if (o.valor_inicial == null || o.valor_meta == null) return null
  const absoluto = o.valor_meta - o.valor_inicial
  return { absoluto, porcentaje: o.valor_inicial === 0 ? null : absoluto / o.valor_inicial }
}
