/**
 * Importación desde Excel/CSV: lectura, detección de encabezados, correspondencia de columnas,
 * conversión de valores y validación fila por fila. Todo es puro (sin red) para poder probarlo.
 * Nunca sobrescribe: solo propone filas nuevas; los posibles duplicados se marcan.
 */
import { ESTADOS, type Estado, type Etapa } from './calculos/publicaciones'
import { aNumero } from './numeros'

export type Celda = string | number | boolean | Date | null
export interface Tabla {
  hoja: string
  filas: Celda[][]
}

export const normalizar = (v: unknown) =>
  String(v ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const vacia = (c: Celda) => c == null || (typeof c === 'string' && c.trim() === '')

// ---------------------------------------------------------------------------
// CSV (RFC 4180, separador ; , o tabulador detectado en la primera línea)
// ---------------------------------------------------------------------------
export function leerCSV(texto: string, hoja = 'CSV'): Tabla {
  const limpio = texto.replace(/^﻿/, '')
  const primera = limpio.split(/\r?\n/, 1)[0] ?? ''
  const sep = [';', ',', '\t'].map((s) => ({ s, n: primera.split(s).length })).sort((a, b) => b.n - a.n)[0].s
  const filas: Celda[][] = []
  let fila: Celda[] = []
  let campo = ''
  let comillas = false
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i]
    if (comillas) {
      if (c === '"' && limpio[i + 1] === '"') {
        campo += '"'
        i++
      } else if (c === '"') comillas = false
      else campo += c
    } else if (c === '"' && campo === '') comillas = true
    else if (c === sep) {
      fila.push(campo)
      campo = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && limpio[i + 1] === '\n') i++
      fila.push(campo)
      filas.push(fila)
      fila = []
      campo = ''
    } else campo += c
  }
  if (campo !== '' || fila.length) {
    fila.push(campo)
    filas.push(fila)
  }
  return { hoja, filas: filas.map((f) => f.map((v) => (v === '' ? null : v))) }
}

// ---------------------------------------------------------------------------
// Encabezados y correspondencia de columnas
// ---------------------------------------------------------------------------

export type Destino = 'publicaciones' | 'auditoria'

export const CAMPOS_DESTINO: Record<Destino, { campo: string; etiqueta: string; requerido?: boolean; sinonimos: string[] }[]> = {
  publicaciones: [
    { campo: 'titulo', etiqueta: 'Título o tema', requerido: true, sinonimos: ['idea / tema de contenido', 'titulo', 'tema', 'temas', 'idea', 'tema del contenido', 'title', 'topic'] },
    { campo: 'fecha', etiqueta: 'Fecha', sinonimos: ['fecha', 'fecha publicada', 'fecha prevista', 'publicar', 'fecha de publicacion', 'date'] },
    { campo: 'hora', etiqueta: 'Hora', sinonimos: ['hora', 'time'] },
    { campo: 'estado', etiqueta: 'Estado', sinonimos: ['estado', 'estatus de publicacion', 'estatus', 'status'] },
    { campo: 'texto', etiqueta: 'Texto (copy)', sinonimos: ['correo', 'copy', 'post', 'texto', 'publicar contenido'] },
    { campo: 'hashtags', etiqueta: 'Hashtags', sinonimos: ['hashtags', 'hashtag'] },
    { campo: 'cta', etiqueta: 'Llamado a la acción', sinonimos: ['llamado a la accion', 'llamada a la accion', 'cta'] },
    { campo: 'categoria', etiqueta: 'Categoría', sinonimos: ['categoria', 'category'] },
    { campo: 'etapa', etiqueta: 'Etapa del embudo', sinonimos: ['etapa del embudo', 'etapa de embudo', 'etapa de viaje del comprador', 'etapa'] },
    { campo: 'tipos', etiqueta: 'Formato / tipo', sinonimos: ['tipo de contenido', 'formato', 'tipo'] },
    { campo: 'canal', etiqueta: 'Red (columna con el nombre de la red)', sinonimos: ['canal', 'red', 'red social'] },
    { campo: 'info_adicional', etiqueta: 'Información adicional', sinonimos: ['informacion adicional'] },
    { campo: 'asignado', etiqueta: 'Asignado a (se guarda en notas)', sinonimos: ['asignado a', 'responsable', 'autor'] },
    { campo: 'semana', etiqueta: 'Semana (se guarda en notas)', sinonimos: ['semana'] },
    { campo: 'dia_semana', etiqueta: 'Día de la semana (se guarda en notas)', sinonimos: ['dia'] },
    { campo: 'notas', etiqueta: 'Notas', sinonimos: ['notas', 'notes'] },
    { campo: 'marca', etiqueta: 'Marca', sinonimos: ['marca', 'brand'] },
  ],
  auditoria: [
    { campo: 'canal', etiqueta: 'Red', requerido: true, sinonimos: ['sitio', 'red', 'red social', 'canal'] },
    { campo: 'perfil', etiqueta: 'Nombre de perfil', sinonimos: ['nombre de perfil', 'perfil', 'usuario'] },
    { campo: 'enlace', etiqueta: 'Enlace', sinonimos: ['enlace', 'link', 'url'] },
    { campo: 'fecha', etiqueta: 'Fecha del registro', sinonimos: ['fecha del registro', 'fecha'] },
    { campo: 'seguidores', etiqueta: 'Seguidores', sinonimos: ['seguidores (hoy)', 'seguidores'] },
    { campo: 'ultima_actividad', etiqueta: 'Última actividad', sinonimos: ['fecha de la ultima actividad', 'ultima actividad'] },
    { campo: 'frecuencia', etiqueta: 'Frecuencia', sinonimos: ['frecuencia de publicaciones', 'frecuencia'] },
    { campo: 'trafico', etiqueta: 'Tráfico de referencia', sinonimos: ['trafico de referencia mensual', 'trafico de referencia', 'trafico'] },
    { campo: 'clics', etiqueta: 'Clics por publicación', sinonimos: ['clics por publicacion'] },
    { campo: 'alcance', etiqueta: 'Alcance', sinonimos: ['alcanzar', 'alcance'] },
  ],
}

/** Columnas de formato marcadas con una «x» (plantilla con tablero: TEXTO / IMAGEN / VIDEO). */
const FORMATOS: [string[], string][] = [
  [['texto', 'txt'], 'Texto'],
  [['imagen', 'img'], 'Imagen'],
  [['video'], 'Video'],
  [['carrusel'], 'Carrusel'],
  [['reel'], 'Reel'],
  [['historia', 'historias'], 'Historia'],
]

/** Nombres de red, incluidos los de la traducción automática de las plantillas. */
const REDES: [string[], string][] = [
  [['facebook'], 'Facebook'],
  [['instagram'], 'Instagram'],
  [['gorjeo', 'twitter', 'x'], 'X'],
  [['vinculado', 'linkedin'], 'LinkedIn'],
  [['tiktok'], 'TikTok'],
  [['youtube'], 'YouTube'],
  [['pinterest'], 'Pinterest'],
  [['threads'], 'Threads'],
  [['blog'], 'Blog'],
  [['whatsapp', 'whatsapp business'], 'WhatsApp Business'],
  [['snapchat'], 'Snapchat'],
  [['tumblr'], 'Tumblr'],
]
export function nombreRed(v: unknown): string | null {
  const n = normalizar(v)
  if (!n) return null
  for (const [alias, red] of REDES) if (alias.includes(n)) return red
  return null
}

const coincide = (h: string, s: string, exacta: boolean) => (exacta ? h === s : s.length >= 4 && h.includes(s) && !/pasad|cambio|%/.test(h))

/** Puntuación de una fila como encabezado: cuántas celdas parecen nombres de columna conocidos. */
function puntuar(fila: Celda[]): number {
  const sinonimos = [...CAMPOS_DESTINO.publicaciones, ...CAMPOS_DESTINO.auditoria].flatMap((c) => c.sinonimos)
  const formatos = FORMATOS.flatMap(([a]) => a)
  return fila.filter((c) => {
    const h = normalizar(c)
    return h && (nombreRed(h) || formatos.includes(h) || sinonimos.some((s) => coincide(h, s, true)))
  }).length
}

/**
 * Fila de encabezados entre las 20 primeras: la que más nombres de columna conocidos tiene
 * (empate: la primera). Si ninguna tiene 2, la primera fila con al menos 2 textos.
 */
export function detectarEncabezado(filas: Celda[][]): number {
  let mejor = -1
  let puntos = 1
  for (let i = 0; i < Math.min(filas.length, 20); i++) {
    const p = puntuar(filas[i] ?? [])
    if (p > puntos) {
      mejor = i
      puntos = p
    }
  }
  if (mejor >= 0) return mejor
  for (let i = 0; i < Math.min(filas.length, 20); i++) {
    const textos = (filas[i] ?? []).filter((c) => typeof c === 'string' && c.trim() && Number.isNaN(Number(c))).length
    if (textos >= 2) return i
  }
  return 0
}

export interface Mapeo {
  campos: Record<string, number | null>
  /** Red marcada por columna; con `hasta`, un bloque de columnas (Plan de contenido: TÍTULO, AUTOR, ENLACE… por red). */
  canales: { col: number; canal: string; hasta?: number }[]
  formatos: { col: number; tipo: string }[]
}

/**
 * Propone qué columna es cada dato. `superior` es la fila de encima del encabezado: si contiene
 * nombres de red, cada red abarca sus columnas hasta la siguiente celda rotulada (bloques por red).
 */
export function adivinarMapeo(encabezados: Celda[], destino: Destino, superior: Celda[] = []): Mapeo {
  const enc = encabezados.map(normalizar)
  const usadas = new Set<number>()
  const canales: Mapeo['canales'] = []
  if (destino === 'publicaciones') {
    // el último bloque termina en la última celda rotulada de la fila superior
    let ancho = superior.length
    while (ancho > 0 && normalizar(superior[ancho - 1]) === '') ancho--
    for (let col = 0; col < superior.length; col++) {
      const red = nombreRed(superior[col])
      if (!red) continue
      let hasta = col
      // celdas vacías o con el nombre del mes (rótulo repetido de la plantilla) continúan el bloque
      while (hasta + 1 < ancho && (normalizar(superior[hasta + 1]) === '' || MESES_TEXTO.includes(normalizar(superior[hasta + 1])))) hasta++
      canales.push({ col, canal: red, hasta })
      for (let k = col; k <= hasta; k++) usadas.add(k)
    }
  }
  const campos: Record<string, number | null> = {}
  for (const pasada of ['exacta', 'contiene'] as const) {
    for (const def of CAMPOS_DESTINO[destino]) {
      if (campos[def.campo] != null) continue
      // el orden de los sinónimos manda: el primero que aparezca en alguna columna libre gana
      for (const s of def.sinonimos) {
        const i = enc.findIndex((h, idx) => !usadas.has(idx) && h && coincide(h, s, pasada === 'exacta'))
        if (i >= 0) {
          campos[def.campo] = i
          usadas.add(i)
          break
        }
      }
    }
  }
  for (const def of CAMPOS_DESTINO[destino]) if (!(def.campo in campos)) campos[def.campo] = null
  const formatos: Mapeo['formatos'] = []
  if (destino === 'publicaciones') {
    enc.forEach((h, col) => {
      if (usadas.has(col) || !h) return
      const red = nombreRed(encabezados[col])
      if (red) {
        canales.push({ col, canal: red })
        usadas.add(col)
        return
      }
      const f = FORMATOS.find(([a]) => a.includes(h))
      if (f) {
        formatos.push({ col, tipo: f[1] })
        usadas.add(col)
      }
    })
    canales.sort((a, b) => a.col - b.col)
  }
  return { campos, canales, formatos }
}

// ---------------------------------------------------------------------------
// Conversión de valores
// ---------------------------------------------------------------------------
const MESES_TEXTO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre', 'puede']

const dosDigitos = (n: number) => String(n).padStart(2, '0')
const fechaValida = (a: number, m: number, d: number) => {
  const f = new Date(Date.UTC(a, m - 1, d))
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d
}

/** Fecha (YYYY-MM-DD) desde: fecha de Excel, número de serie, "2026-11-03", "03/11/2026" (día/mes) o "3-11-26". */
export function parsearFecha(v: Celda): { dia: string; hora: string | null } | null | 'invalida' {
  if (vacia(v)) return null
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return 'invalida'
    const hora = v.getUTCHours() || v.getUTCMinutes() ? `${dosDigitos(v.getUTCHours())}:${dosDigitos(v.getUTCMinutes())}` : null
    return { dia: v.toISOString().slice(0, 10), hora }
  }
  if (typeof v === 'number') {
    if (v < 20000 || v > 80000) return 'invalida' // serie de Excel entre 1954 y 2119
    const f = new Date(Math.round((v - 25569) * 86400000))
    return parsearFecha(f)
  }
  const s = String(v).trim()
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/)
  if (m) {
    const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
    return fechaValida(a, mes, d) ? { dia: `${a}-${dosDigitos(mes)}-${dosDigitos(d)}`, hora: m[4] ? `${dosDigitos(Number(m[4]))}:${m[5]}` : null } : 'invalida'
  }
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/)
  if (m) {
    const d = Number(m[1])
    const mes = Number(m[2])
    const a = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
    return fechaValida(a, mes, d) ? { dia: `${a}-${dosDigitos(mes)}-${dosDigitos(d)}`, hora: m[4] ? `${dosDigitos(Number(m[4]))}:${m[5]}` : null } : 'invalida'
  }
  return 'invalida'
}

export function parsearHora(v: Celda): string | null | 'invalida' {
  if (vacia(v)) return null
  if (v instanceof Date) return `${dosDigitos(v.getUTCHours())}:${dosDigitos(v.getUTCMinutes())}`
  if (typeof v === 'number' && v >= 0 && v < 1) {
    const min = Math.round(v * 24 * 60)
    return `${dosDigitos(Math.floor(min / 60))}:${dosDigitos(min % 60)}`
  }
  const m = String(v).trim().match(/^(\d{1,2}):(\d{2})\s*(a\.?\s?m\.?|p\.?\s?m\.?)?$/i)
  if (!m) return 'invalida'
  let h = Number(m[1])
  const pm = m[3] && /p/i.test(m[3])
  if (m[3] && h === 12) h = pm ? 12 : 0
  else if (pm) h += 12
  return h < 24 && Number(m[2]) < 60 ? `${dosDigitos(h)}:${m[2]}` : 'invalida'
}

/** Estados de las plantillas (español traducido e inglés original) -> estados de la app. */
const ESTADOS_PLANTILLA: [string[], Estado][] = [
  [['idea', 'no comenzo', 'no comenzado', 'not started', 'pendiente'], 'idea'],
  [['borrador', 'en curso', 'in progress', 'atrasado', 'overdue', 'actualizacion de necesidades', 'necesita actualizacion', 'needs update'], 'borrador'],
  [['en revision', 'necesita revision', 'needs review', 'in review'], 'en_revision'],
  [['aprobado', 'approved'], 'aprobado'],
  [['programado', 'scheduled'], 'programado'],
  [['publicado', 'al corriente', 'posted', 'published'], 'publicado'],
  [['en espera', 'en pausa', 'on hold'], 'en_pausa'],
  [['descartado', 'animado', 'nixed', 'cancelado'], 'descartado'],
]
export function mapearEstado(v: Celda): Estado | null | 'desconocido' {
  const n = normalizar(v)
  if (!n) return null
  if ((ESTADOS as readonly string[]).includes(n.replace(' ', '_'))) return n.replace(' ', '_') as Estado
  for (const [alias, e] of ESTADOS_PLANTILLA) if (alias.includes(n)) return e
  return 'desconocido'
}

const ETAPAS_PLANTILLA: [string[], Etapa][] = [
  [['conciencia', 'awareness', 'descubrimiento'], 'conciencia'],
  [['investigacion', 'consideracion', 'consideration', 'research'], 'investigacion'],
  [['decision'], 'decision'],
  [['compra', 'purchase'], 'compra'],
  [['retencion', 'retention', 'fidelizacion'], 'retencion'],
]
export function mapearEtapa(v: Celda): Etapa | null | 'desconocida' {
  const n = normalizar(v)
  if (!n) return null
  for (const [alias, e] of ETAPAS_PLANTILLA) if (alias.includes(n)) return e
  return 'desconocida'
}

/** Una celda de red marcada ("x", "sí", "incógnita"…). Vacío, "no", "0" o "falso" = no marcada. */
export const marcada = (v: Celda) => !vacia(v) && !['no', '0', 'false', 'falso', 'n'].includes(normalizar(v))

const texto = (v: Celda, max: number) => (vacia(v) ? '' : (v instanceof Date ? v.toISOString().slice(0, 10) : String(v)).trim().slice(0, max))

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------
export interface FilaValidada<T> {
  fila: number // número de fila en Excel (1 = primera)
  datos: T | null
  errores: string[]
  avisos: string[]
  duplicado: boolean
}

export interface PublicacionImportada {
  titulo: string
  dia: string | null
  hora: string
  estado: Estado
  texto: string
  hashtags: string
  cta: string
  categoria: string
  etapa: Etapa | null
  tipos: string[]
  info_adicional: string
  notas: string
  marca: string | null // nombre en el archivo, si hay columna
  canales: string[]
}

const val = (fila: Celda[], col: number | null | undefined) => (col == null ? null : (fila[col] ?? null))

/** La fila repite los nombres de columna del encabezado en las columnas usadas (bloques por mes). */
function repiteEncabezado(f: Celda[], encabezado: Celda[], mapeo: Mapeo): boolean {
  const cols = Object.values(mapeo.campos).filter((c): c is number => c != null)
  let iguales = 0
  for (const c of cols) {
    const v = normalizar(f[c])
    if (!v) continue
    if (v !== normalizar(encabezado[c])) return false
    iguales++
  }
  return iguales >= 2
}

export function validarPublicaciones(
  filas: Celda[][],
  filaEncabezado: number,
  mapeo: Mapeo,
  existentes: Set<string>, // claves titulo|dia ya guardadas
): FilaValidada<PublicacionImportada>[] {
  const firma = (f: Celda[] | undefined) => (f ?? []).map((c) => (MESES_TEXTO.includes(normalizar(c)) ? '' : normalizar(c))).join('|').replace(/\|+$/, '')
  const enc = firma(filas[filaEncabezado])
  const sup = filaEncabezado > 0 ? firma(filas[filaEncabezado - 1]) : null
  const vistas = new Set<string>()
  const out: FilaValidada<PublicacionImportada>[] = []
  const bloqueMarcado = (f: Celda[], c: Mapeo['canales'][number]) => {
    for (let k = c.col; k <= (c.hasta ?? c.col); k++) if (c.hasta != null ? !vacia(f[k] ?? null) : marcada(f[k] ?? null)) return true
    return false
  }
  for (let i = filaEncabezado + 1; i < filas.length; i++) {
    const f = filas[i] ?? []
    if (f.every(vacia)) continue
    const fi = firma(f)
    if (fi === enc || (sup && fi === sup) || MESES_TEXTO.includes(fi.replace(/\|/g, ''))) continue // encabezados repetidos de los bloques por mes
    if (fi.replace(/\|/g, '') === '') continue // solo el nombre de un mes
    if (repiteEncabezado(f, filas[filaEncabezado] ?? [], mapeo)) continue
    let tituloCrudo = texto(val(f, mapeo.campos.titulo), 1000)
    const textoCrudo = texto(val(f, mapeo.campos.texto), 10000)
    const canalesMarcados = mapeo.canales.filter((c) => bloqueMarcado(f, c)).map((c) => c.canal)
    const formatosMarcados = mapeo.formatos.filter((x) => marcada(f[x.col] ?? null)).map((x) => x.tipo)
    // Filas solo con estado, categoría o etapa son las listas de valores de las plantillas, no publicaciones
    const sustanciales = ['titulo', 'fecha', 'texto', 'hashtags', 'cta', 'info_adicional', 'notas']
    const hayContenido = sustanciales.some((k) => !vacia(val(f, mapeo.campos[k]))) || canalesMarcados.length > 0 || formatosMarcados.length > 0
    if (!hayContenido) continue
    const errores: string[] = []
    const avisos: string[] = []
    if (!tituloCrudo && textoCrudo) {
      tituloCrudo = textoCrudo.replace(/\s+/g, ' ').slice(0, 80)
      avisos.push('Sin título: se usa el comienzo del texto.')
    }
    if (!tituloCrudo) errores.push('Falta el título o tema.')
    const fecha = parsearFecha(val(f, mapeo.campos.fecha))
    if (fecha === 'invalida') errores.push(`Fecha no reconocida: «${texto(val(f, mapeo.campos.fecha), 40)}». Usa día/mes/año o año-mes-día.`)
    const horaCol = parsearHora(val(f, mapeo.campos.hora))
    if (horaCol === 'invalida') errores.push(`Hora no reconocida: «${texto(val(f, mapeo.campos.hora), 20)}». Usa HH:MM.`)
    const estadoMap = mapearEstado(val(f, mapeo.campos.estado))
    if (estadoMap === 'desconocido') errores.push(`Estado no reconocido: «${texto(val(f, mapeo.campos.estado), 40)}».`)
    const etapaMap = mapearEtapa(val(f, mapeo.campos.etapa))
    if (etapaMap === 'desconocida') avisos.push(`Etapa no reconocida («${texto(val(f, mapeo.campos.etapa), 40)}»); se deja sin etapa.`)

    const dia = fecha && fecha !== 'invalida' ? fecha.dia : null
    let estado: Estado = estadoMap && estadoMap !== 'desconocido' ? estadoMap : dia ? 'borrador' : 'idea'
    if (estado === 'programado' && !dia) {
      estado = 'aprobado'
      avisos.push('Estaba «programado» sin fecha; se importa como «aprobado».')
    }
    const tiposTexto = texto(val(f, mapeo.campos.tipos), 200)
    const canalCol = texto(val(f, mapeo.campos.canal), 60)
    if (canalCol) canalesMarcados.push(nombreRed(canalCol) ?? canalCol)
    const extras = [
      texto(val(f, mapeo.campos.notas), 2500),
      texto(val(f, mapeo.campos.asignado), 120) && `Asignado a: ${texto(val(f, mapeo.campos.asignado), 120)}`,
      [texto(val(f, mapeo.campos.semana), 20) && `Semana ${texto(val(f, mapeo.campos.semana), 20)}`, texto(val(f, mapeo.campos.dia_semana), 20).toLowerCase()]
        .filter(Boolean)
        .join(' · '),
    ].filter(Boolean)
    const datos: PublicacionImportada = {
      titulo: tituloCrudo.slice(0, 200),
      dia,
      hora: (horaCol && horaCol !== 'invalida' ? horaCol : null) ?? (fecha && fecha !== 'invalida' ? fecha.hora : null) ?? '09:00',
      estado,
      texto: textoCrudo,
      hashtags: texto(val(f, mapeo.campos.hashtags), 1000),
      cta: texto(val(f, mapeo.campos.cta), 300),
      categoria: texto(val(f, mapeo.campos.categoria), 60),
      etapa: etapaMap && etapaMap !== 'desconocida' ? etapaMap : null,
      tipos: [...new Set([...(tiposTexto ? tiposTexto.split(/[,/;]+/).map((t) => t.trim()).filter(Boolean) : []), ...formatosMarcados])].slice(0, 10),
      info_adicional: texto(val(f, mapeo.campos.info_adicional), 2000),
      notas: extras.join('\n').slice(0, 3000),
      marca: mapeo.campos.marca != null ? texto(val(f, mapeo.campos.marca), 80) || null : null,
      canales: [...new Set(canalesMarcados)],
    }
    if (tituloCrudo.length > 200) avisos.push('El título tenía más de 200 caracteres; se recortó.')
    const clave = `${normalizar(datos.titulo)}|${datos.dia ?? ''}`
    const duplicado = existentes.has(clave) || vistas.has(clave)
    vistas.add(clave)
    out.push({ fila: i + 1, datos: errores.length ? null : datos, errores, avisos, duplicado })
  }
  return out
}

export interface AuditoriaImportada {
  canal: string
  perfil: string
  enlace: string
  fecha: string
  seguidores: number | null
  ultima_actividad: string | null
  frecuencia: string
  trafico: number | null
  clics: number | null
  alcance: number | null
}

export function validarAuditoria(
  filas: Celda[][],
  filaEncabezado: number,
  mapeo: Mapeo,
  hoy: string,
  existentes: Set<string>, // claves canal|perfil|fecha
): FilaValidada<AuditoriaImportada>[] {
  const out: FilaValidada<AuditoriaImportada>[] = []
  const vistas = new Set<string>()
  for (let i = filaEncabezado + 1; i < filas.length; i++) {
    const f = filas[i] ?? []
    if (f.every(vacia)) continue
    const canalCrudo = texto(val(f, mapeo.campos.canal), 60)
    const numeros = ['seguidores', 'trafico', 'clics', 'alcance'] as const
    const hayDatos = numeros.some((k) => !vacia(val(f, mapeo.campos[k]))) || !vacia(val(f, mapeo.campos.ultima_actividad)) || !vacia(val(f, mapeo.campos.frecuencia))
    if (!canalCrudo) {
      if (hayDatos) out.push({ fila: i + 1, datos: null, errores: ['Falta la red.'], avisos: [], duplicado: false })
      continue
    }
    if (!hayDatos && vacia(val(f, mapeo.campos.enlace)) && vacia(val(f, mapeo.campos.perfil))) continue // fila de plantilla sin llenar
    const errores: string[] = []
    const avisos: string[] = []
    const red = nombreRed(canalCrudo)
    if (!red && /^otro/i.test(normalizar(canalCrudo))) continue
    const fecha = parsearFecha(val(f, mapeo.campos.fecha))
    if (fecha === 'invalida') errores.push('Fecha del registro no reconocida.')
    const ult = parsearFecha(val(f, mapeo.campos.ultima_actividad))
    if (ult === 'invalida') errores.push('Fecha de última actividad no reconocida.')
    const nums: Record<(typeof numeros)[number], number | null> = { seguidores: null, trafico: null, clics: null, alcance: null }
    for (const k of numeros) {
      const c = val(f, mapeo.campos[k])
      const n = typeof c === 'number' ? c : vacia(c) ? null : aNumero(String(c).replace('%', ''))
      if (n != null && (Number.isNaN(n) || n < 0)) errores.push(`${k === 'trafico' ? 'Tráfico' : k[0].toUpperCase() + k.slice(1)}: «${texto(c, 20)}» no es un número válido.`)
      else nums[k] = n == null ? null : k === 'clics' ? n : Math.round(n)
    }
    const enlace = texto(val(f, mapeo.campos.enlace), 500)
    const enlaceOk = !enlace || /^https?:\/\/\S+$/i.test(enlace)
    if (!enlaceOk) avisos.push('El enlace no empieza por https://; no se guarda.')
    const diaRegistro = fecha && fecha !== 'invalida' ? fecha.dia : hoy
    if (!fecha) avisos.push(`Sin fecha: se registra con la de hoy (${hoy}).`)
    if (diaRegistro > hoy) errores.push('La fecha del registro no puede ser futura.')
    const datos: AuditoriaImportada = {
      canal: red ?? canalCrudo,
      perfil: texto(val(f, mapeo.campos.perfil), 120),
      enlace: enlaceOk ? enlace : '',
      fecha: diaRegistro,
      seguidores: nums.seguidores,
      ultima_actividad: ult && ult !== 'invalida' ? ult.dia : null,
      frecuencia: texto(val(f, mapeo.campos.frecuencia), 120),
      trafico: nums.trafico,
      clics: nums.clics,
      alcance: nums.alcance,
    }
    const clave = `${normalizar(datos.canal)}|${normalizar(datos.perfil)}|${datos.fecha}`
    const duplicado = existentes.has(clave) || vistas.has(clave)
    vistas.add(clave)
    out.push({ fila: i + 1, datos: errores.length ? null : datos, errores, avisos, duplicado })
  }
  return out
}
