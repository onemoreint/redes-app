import { describe, expect, it } from 'vitest'
import {
  adivinarMapeo,
  detectarEncabezado,
  leerCSV,
  mapearEstado,
  mapearEtapa,
  marcada,
  nombreRed,
  parsearFecha,
  parsearHora,
  validarAuditoria,
  validarPublicaciones,
  type Celda,
} from './importar'

// Réplica de la estructura de "Horario de redes sociales.xlsx" (fila 1 título, fila 2 encabezados)
const horario: Celda[][] = [
  ['Plantilla de horario de redes sociales'],
  ['FECHA', 'Estatus de publicación', 'Temas', 'CORREO', 'Hashtags', 'CARBONIZARSE. CONTAR', 'FACEBOOK', 'Instagram', 'GORJEO', 'Blog', 'LinkedIn', 'Tiktok', 'Snapchat'],
  [new Date(Date.UTC(2026, 10, 3)), 'al corriente', 'Guía de cómo hacer', 'Texto del post', '#guia', 15, 'x', null, 'incógnita', null, null, null, null],
  ['04/11/2026', 'en espera', 'Concurso', null, null, null, null, 'x', null, null, null, 'x', null],
  [null, 'animado', 'Idea descartada', null, null, null, null, null, null, null, null, null, null],
  ['31/02/2026', 'aprobado', 'Fecha imposible', null, null, null, null, null, null, null, null, null, null],
  [46000, 'raro', 'Estado raro', null, null, null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null, null, null, null, null, null],
  [new Date(Date.UTC(2026, 10, 3)), 'al corriente', 'guía de cómo hacer', null, null, null, null, null, null, null, null, null, null],
]

describe('Lectura y encabezados', () => {
  it('detecta la fila de encabezados aunque haya un título encima', () => {
    expect(detectarEncabezado(horario)).toBe(1)
  })

  it('lee CSV con punto y coma, comillas, saltos y BOM', () => {
    const t = leerCSV('﻿Fecha;Tema;Texto\r\n03/11/2026;"Guía; parte 1";"Línea 1\nLínea 2"\r\n04/11/2026;"Dijo ""hola""";\r\n')
    expect(t.filas).toEqual([
      ['Fecha', 'Tema', 'Texto'],
      ['03/11/2026', 'Guía; parte 1', 'Línea 1\nLínea 2'],
      ['04/11/2026', 'Dijo "hola"', null],
    ])
  })

  it('lee CSV con coma', () => {
    expect(leerCSV('a,b\n1,2').filas).toEqual([['a', 'b'], ['1', '2']])
  })
})

describe('Correspondencia de columnas', () => {
  it('reconoce los encabezados del Horario (incluida la traducción automática)', () => {
    const m = adivinarMapeo(horario[1], 'publicaciones')
    expect(m.campos.fecha).toBe(0)
    expect(m.campos.estado).toBe(1)
    expect(m.campos.titulo).toBe(2)
    expect(m.campos.texto).toBe(3) // "CORREO" era "POST"
    expect(m.campos.hashtags).toBe(4)
    expect(m.canales.map((c) => c.canal)).toEqual(['Facebook', 'Instagram', 'X', 'Blog', 'LinkedIn', 'TikTok', 'Snapchat'])
  })

  it('reconoce los encabezados del Plan de contenido', () => {
    const m = adivinarMapeo(
      ['Idea / tema de contenido', 'CATEGORÍA', 'Etapa de viaje del comprador', 'INFORMACIÓN ADICIONAL', 'Fecha publicada', 'ESTADO', 'TÍTULO', 'AUTOR', 'ENLACE', 'KPI', 'Notas'],
      'publicaciones',
    )
    expect(m.campos.titulo).toBe(0)
    expect(m.campos.categoria).toBe(1)
    expect(m.campos.etapa).toBe(2)
    expect(m.campos.info_adicional).toBe(3)
    expect(m.campos.fecha).toBe(4)
    expect(m.campos.estado).toBe(5)
    expect(m.campos.notas).toBe(10)
  })

  it('reconoce la plantilla de Auditoría sin confundir columnas "del mes pasado"', () => {
    const m = adivinarMapeo(
      ['SITIO', 'ENLACE', 'Nombre de perfil', 'Seguidores', 'Fecha de la última actividad', 'Frecuencia de publicaciones', 'Tráfico de referencia mensual', '% Del cambio (el año pasado)', 'Clics por publicación', 'Clics por publicación (el mes pasado)', 'ALCANZAR'],
      'auditoria',
    )
    expect(m.campos).toMatchObject({ canal: 0, enlace: 1, perfil: 2, seguidores: 3, ultima_actividad: 4, frecuencia: 5, trafico: 6, clics: 8, alcance: 10 })
  })

  it('nombres de red de la traducción automática', () => {
    expect(nombreRed('GORJEO')).toBe('X')
    expect(nombreRed('Vinculado')).toBe('LinkedIn')
    expect(nombreRed('YOUTUBE')).toBe('YouTube')
    expect(nombreRed('OTRO')).toBeNull()
  })
})

describe('Conversión de valores', () => {
  it('fechas en varios formatos; imposibles son inválidas', () => {
    expect(parsearFecha('2026-11-03')).toEqual({ dia: '2026-11-03', hora: null })
    expect(parsearFecha('03/11/2026')).toEqual({ dia: '2026-11-03', hora: null }) // día/mes/año
    expect(parsearFecha('3-11-26 14:30')).toEqual({ dia: '2026-11-03', hora: '14:30' })
    expect(parsearFecha(46000)).toEqual({ dia: '2025-12-09', hora: null }) // número de serie de Excel
    expect(parsearFecha('31/02/2026')).toBe('invalida')
    expect(parsearFecha('mañana')).toBe('invalida')
    expect(parsearFecha(null)).toBeNull()
  })
  it('horas', () => {
    expect(parsearHora('9:05')).toBe('09:05')
    expect(parsearHora('2:30 pm')).toBe('14:30')
    expect(parsearHora('12:00 a. m.')).toBe('00:00')
    expect(parsearHora(0.5)).toBe('12:00')
    expect(parsearHora('25:00')).toBe('invalida')
  })
  it('estados de las plantillas en español traducido e inglés', () => {
    expect(mapearEstado('al corriente')).toBe('publicado')
    expect(mapearEstado('Animado')).toBe('descartado')
    expect(mapearEstado('en espera')).toBe('en_pausa')
    expect(mapearEstado('NECESITA REVISIÓN')).toBe('en_revision')
    expect(mapearEstado('No comenzó')).toBe('idea')
    expect(mapearEstado('Atrasado')).toBe('borrador')
    expect(mapearEstado('Published')).toBe('publicado')
    expect(mapearEstado('en revision')).toBe('en_revision')
    expect(mapearEstado('raro')).toBe('desconocido')
  })
  it('etapas y marcas de red', () => {
    expect(mapearEtapa('Consideración')).toBe('investigacion')
    expect(mapearEtapa('Retención')).toBe('retencion')
    expect(marcada('incógnita')).toBe(true)
    expect(marcada('x')).toBe(true)
    expect(marcada('No')).toBe(false)
    expect(marcada(null)).toBe(false)
  })
})

describe('Validación de publicaciones', () => {
  const m = adivinarMapeo(horario[1], 'publicaciones')
  const r = validarPublicaciones(horario, 1, m, new Set(['concurso|2026-11-04']))

  it('procesa filas con datos y omite vacías', () => {
    expect(r.map((x) => x.fila)).toEqual([3, 4, 5, 6, 7, 9])
  })
  it('fila válida completa, con redes marcadas', () => {
    expect(r[0].errores).toEqual([])
    expect(r[0].datos).toMatchObject({
      titulo: 'Guía de cómo hacer',
      dia: '2026-11-03',
      hora: '09:00',
      estado: 'publicado',
      texto: 'Texto del post',
      hashtags: '#guia',
      canales: ['Facebook', 'X'],
    })
  })
  it('marca como duplicada la que ya existe y la repetida en el archivo', () => {
    expect(r[1].duplicado).toBe(true) // ya existe
    expect(r[5].duplicado).toBe(true) // repetida (sin importar mayúsculas)
    expect(r[0].duplicado).toBe(false)
  })
  it('sin fecha pasa a idea/descartada según su estado', () => {
    expect(r[2].datos?.estado).toBe('descartado')
    expect(r[2].datos?.dia).toBeNull()
  })
  it('rechaza fecha imposible y estado desconocido con mensajes claros', () => {
    expect(r[3].datos).toBeNull()
    expect(r[3].errores[0]).toMatch(/Fecha no reconocida/)
    expect(r[4].errores[0]).toMatch(/Estado no reconocido/)
  })
  it('salta encabezados repetidos y títulos de mes de los bloques', () => {
    const plan: Celda[][] = [
      ['ENERO', null, null],
      ['Idea / tema de contenido', 'ESTADO', 'Fecha publicada'],
      ['Guía', 'En curso', '2026-01-10'],
      ['FEBRERO', null, null],
      ['Idea / tema de contenido', 'ESTADO', 'Fecha publicada'],
      ['Nuevo producto', 'Publicado', '2026-02-02'],
    ]
    const mp = adivinarMapeo(plan[1], 'publicaciones')
    const v = validarPublicaciones(plan, 1, mp, new Set())
    expect(v.map((x) => x.datos?.titulo)).toEqual(['Guía', 'Nuevo producto'])
  })
  it('programado sin fecha se importa como aprobado, con aviso', () => {
    const t: Celda[][] = [['Tema', 'Estado'], ['X', 'Programado']]
    const v = validarPublicaciones(t, 0, adivinarMapeo(t[0], 'publicaciones'), new Set())
    expect(v[0].datos?.estado).toBe('aprobado')
    expect(v[0].avisos[0]).toMatch(/programado/)
  })
})

describe('Validación de auditoría', () => {
  const aud: Celda[][] = [
    ['SITIO', 'ENLACE', 'Nombre de perfil', 'Seguidores', 'Fecha de la última actividad', 'Tráfico de referencia mensual', 'Clics por publicación', 'ALCANZAR'],
    ['FACEBOOK', 'https://facebook.com/marca', 'Marca', 1200, '20/10/2026', '1.500', 12.5, 3000],
    ['Instagram', null, null, null, null, null, null, null], // fila de plantilla sin llenar
    ['GORJEO', 'twitter.com/marca', '@marca', -5, null, null, null, null],
    ['OTRO', null, null, 10, null, null, null, null],
  ]
  const m = adivinarMapeo(aud[0], 'auditoria')
  const v = validarAuditoria(aud, 0, m, '2026-10-25', new Set())
  it('importa la fila llena con la fecha de hoy si no hay fecha', () => {
    expect(v[0].datos).toMatchObject({ canal: 'Facebook', perfil: 'Marca', seguidores: 1200, ultima_actividad: '2026-10-20', trafico: 1500, clics: 12.5, alcance: 3000, fecha: '2026-10-25' })
    expect(v[0].avisos[0]).toMatch(/Sin fecha/)
  })
  it('omite filas de plantilla vacías y las de "OTRO"', () => {
    expect(v).toHaveLength(2)
  })
  it('rechaza números negativos y avisa del enlace sin https', () => {
    expect(v[1].datos).toBeNull()
    expect(v[1].errores[0]).toMatch(/Seguidores/)
    expect(v[1].avisos[0]).toMatch(/enlace/)
  })
})

describe('Estructuras de las plantillas reales', () => {
  it('Plan de contenido: bloques por red bajo una fila superior, encabezados repetidos por mes y listas de valores', () => {
    const filas: Celda[][] = [
      [null, 'Plantilla de plan de contenido'],
      [null, 'ENERO', null, null, 'FACEBOOK', null, 'ENERO', 'GORJEO', null, 'ENERO'],
      [null, 'Idea / tema de contenido', 'ESTADO', 'Fecha publicada', 'TÍTULO', 'AUTOR', 'Notas', 'TÍTULO', 'AUTOR', 'Notas', 'Clave de estado'],
      [null, 'Guía', 'En curso', '2026-01-10', 'Guía FB', 'Ana', null, null, null, null, 'No comenzó'],
      [null, null, 'NECESITA REVISIÓN', null, null, null, null, null, null, null, 'NECESITA REVISIÓN'],
      [null, 'FEBRERO', null, null, 'FACEBOOK', null, 'FEBRERO', 'GORJEO', null, 'FEBRERO'],
      [null, 'Idea / tema de contenido', 'ESTADO', 'Fecha publicada', 'TÍTULO', 'AUTOR', 'Notas', 'TÍTULO', 'AUTOR', 'Notas'],
      [null, 'Lanzamiento', 'Publicado', '2026-02-02', null, null, null, null, 'Luis', null],
    ]
    const enc = detectarEncabezado(filas)
    expect(enc).toBe(2)
    const m = adivinarMapeo(filas[enc], 'publicaciones', filas[enc - 1])
    expect(m.canales).toEqual([
      { col: 4, canal: 'Facebook', hasta: 6 },
      { col: 7, canal: 'X', hasta: 9 },
    ])
    expect(m.campos.notas).toBeNull() // las Notas de cada red no son las de la publicación
    const v = validarPublicaciones(filas, enc, m, new Set())
    expect(v.map((x) => [x.fila, x.datos?.titulo, x.datos?.canales])).toEqual([
      [4, 'Guía', ['Facebook']],
      [8, 'Lanzamiento', ['X']],
    ])
  })

  it('Plan multicanal: la red viene en una columna y «Asignado a» pasa a notas', () => {
    const filas: Celda[][] = [
      [null, 'MES:', 'Noviembre'],
      [null, 'CANAL', 'Etapa de embudo', 'TEMA', 'Tipo de contenido', 'Llamado a la acción', 'Asignado a', 'Publicar', null, 'Conciencia'],
      [null, 'Gorjeo', 'Decisión', 'Black Friday', 'Video', 'Compra ya', 'Ana', '20/11/2026', null, 'Investigación'],
      [null, 'Instagram', 'Compra', null, null, null, null, null, null, 'Compra'],
    ]
    const enc = detectarEncabezado(filas)
    expect(enc).toBe(1)
    const v = validarPublicaciones(filas, enc, adivinarMapeo(filas[enc], 'publicaciones', filas[enc - 1]), new Set())
    expect(v).toHaveLength(1) // la fila de ejemplo sin tema no es una publicación
    expect(v[0].datos).toMatchObject({ titulo: 'Black Friday', canales: ['X'], etapa: 'decision', tipos: ['Video'], cta: 'Compra ya', dia: '2026-11-20', notas: 'Asignado a: Ana' })
  })

  it('Tablero: formatos marcados con «x», semana y día a notas, sin título usa el texto', () => {
    const filas: Celda[][] = [
      [null, 'SEMANA', 'DÍA', 'Temas', 'CORREO', 'TEXTO', 'IMAGEN', 'VIDEO', 'Hashtags', 'FACEBOOK', 'Instagram'],
      [null, 1, 'LUNES', 'Consejo del día', 'Hola', null, 'incógnita', null, '#tip', 'incógnita', null],
      [null, 1, 'MARTES', null, 'Texto largo de la publicación sin tema', 'x', null, null, null, null, 'x'],
      [null, 2, 'MIÉRCOLES', null, null, null, null, 'x', null, 'x', null],
    ]
    const m = adivinarMapeo(filas[0], 'publicaciones')
    expect(m.campos.texto).toBe(4)
    expect(m.formatos.map((f) => f.tipo)).toEqual(['Texto', 'Imagen', 'Video'])
    const v = validarPublicaciones(filas, 0, m, new Set())
    expect(v[0].datos).toMatchObject({ titulo: 'Consejo del día', tipos: ['Imagen'], canales: ['Facebook'], notas: 'Semana 1 · lunes', estado: 'idea', dia: null })
    expect(v[1].datos?.titulo).toBe('Texto largo de la publicación sin tema')
    expect(v[1].avisos[0]).toMatch(/Sin título/)
    expect(v[2].errores).toEqual(['Falta el título o tema.'])
  })
})
