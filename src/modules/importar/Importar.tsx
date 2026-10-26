import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useEspacio } from '../../app/espacio'
import { useSesion } from '../../app/sesion'
import { Aviso, Boton, Encabezado, Selector, Tarjeta, useNotas } from '../../components/ui'
import { supabase } from '../../lib/datos/supabase'
import { exigir, mensajeError } from '../../lib/datos/errores'
import { puede } from '../../lib/roles'
import { CANALES } from '../../lib/canales'
import { aInstante, partesLocales } from '../../lib/calculos/calendario'
import {
  adivinarMapeo,
  CAMPOS_DESTINO,
  detectarEncabezado,
  leerCSV,
  normalizar,
  validarAuditoria,
  validarPublicaciones,
  type AuditoriaImportada,
  type Celda,
  type Destino,
  type FilaValidada,
  type Mapeo,
  type PublicacionImportada,
  type Tabla,
} from '../../lib/importar'
import { hoyEn, useMarcas } from '../marcas/datos'
import { NOMBRE_ESTADO } from '../publicaciones/catalogos'

const TAMANO_MAXIMO = 15 * 1024 * 1024
const LOTE = 100

type Paso = 'archivo' | 'columnas' | 'revisar' | 'hecho'
type Rechazo = { fila: number; motivo: string }
interface Resultado {
  importadas: number
  rechazadas: Rechazo[]
}

const columnaLetra = (i: number) => {
  let s = ''
  let n = i + 1
  while (n > 0) {
    const r = (n - 1) % 26
    s = String.fromCharCode(65 + r) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}
const mostrar = (c: Celda) => (c == null ? '' : c instanceof Date ? c.toISOString().slice(0, 10) : String(c))

export default function Importar() {
  const { actual } = useEspacio()
  if (!puede.editar(actual?.rol)) {
    return (
      <>
        <Encabezado titulo="Importar" />
        <Aviso tipo="info">Solo administradores y editores pueden importar datos en este espacio.</Aviso>
      </>
    )
  }
  return <Asistente />
}

function Asistente() {
  const { actual } = useEspacio()
  const espacio = actual!
  const { sesion } = useSesion()
  const marcas = useMarcas(espacio.id)
  const activas = (marcas.data ?? []).filter((m) => !m.archivada)
  const cliente = useQueryClient()
  const avisar = useNotas()

  const [paso, setPaso] = useState<Paso>('archivo')
  const [destino, setDestino] = useState<Destino>('publicaciones')
  const [marcaId, setMarcaId] = useState('')
  const [archivo, setArchivo] = useState<string>('')
  const [tablas, setTablas] = useState<Tabla[]>([])
  const [hojaIdx, setHojaIdx] = useState(0)
  const [filaEnc, setFilaEnc] = useState(0)
  const [mapeo, setMapeo] = useState<Mapeo | null>(null)
  const [leyendo, setLeyendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existentes, setExistentes] = useState<Set<string>>(new Set())
  const [incluirDuplicados, setIncluirDuplicados] = useState(false)
  const [importando, setImportando] = useState(false)
  const [progreso, setProgreso] = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  const marca = marcaId || activas[0]?.id || ''
  const tabla = tablas[hojaIdx]
  const hoy = hoyEn(espacio.zona_horaria)

  async function leerArchivo(f: File) {
    setError(null)
    if (f.size > TAMANO_MAXIMO) return setError('El archivo pesa más de 15 MB. Divide la información en archivos más pequeños.')
    const ext = f.name.toLowerCase().split('.').pop()
    if (!['xlsx', 'csv', 'txt'].includes(ext ?? ''))
      return setError('Formato no admitido. Usa .xlsx (Excel) o .csv. Si tienes un .xls antiguo, ábrelo en Excel y guárdalo como .xlsx.')
    setLeyendo(true)
    try {
      const t = ext === 'xlsx' ? await (await import('../../lib/excel')).leerXlsx(await f.arrayBuffer()) : [leerCSV(await f.text(), f.name)]
      const conDatos = t.filter((x) => x.filas.some((r) => r.some((c) => c != null && String(c).trim() !== '')))
      if (!conDatos.length) throw new Error('El archivo no tiene datos.')
      setArchivo(f.name)
      setTablas(conDatos)
      elegirHoja(conDatos, 0, destino)
      setPaso('columnas')
    } catch (e) {
      setError(e instanceof Error && e.message === 'El archivo no tiene datos.' ? e.message : 'No se pudo leer el archivo. Comprueba que sea un Excel (.xlsx) o CSV válido y que no tenga contraseña.')
    } finally {
      setLeyendo(false)
    }
  }

  function elegirHoja(ts: Tabla[], i: number, d: Destino) {
    setHojaIdx(i)
    const enc = detectarEncabezado(ts[i].filas)
    setFilaEnc(enc)
    setMapeo(adivinarMapeo(ts[i].filas[enc] ?? [], d, ts[i].filas[enc - 1] ?? []))
  }

  function cambiarEncabezado(n: number) {
    setFilaEnc(n)
    setMapeo(adivinarMapeo(tabla.filas[n] ?? [], destino, tabla.filas[n - 1] ?? []))
  }

  async function cargarExistentes() {
    const claves = new Set<string>()
    if (destino === 'publicaciones') {
      for (let desde = 0; ; desde += 1000) {
        const lote = exigir(
          await supabase.from('publicaciones').select('titulo, fecha_prevista').eq('marca_id', marca).range(desde, desde + 999),
        )
        for (const p of lote) claves.add(`${normalizar(p.titulo)}|${p.fecha_prevista ? partesLocales(p.fecha_prevista, espacio.zona_horaria).dia : ''}`)
        if (lote.length < 1000) break
      }
    } else {
      const cuentas = exigir(await supabase.from('cuentas_red').select('id, canal, nombre_perfil').eq('marca_id', marca))
      const porId = new Map(cuentas.map((c) => [c.id, c]))
      if (cuentas.length) {
        for (let desde = 0; ; desde += 1000) {
          const lote = exigir(
            await supabase.from('registros_auditoria').select('cuenta_id, fecha').in('cuenta_id', cuentas.map((c) => c.id)).range(desde, desde + 999),
          )
          for (const r of lote) {
            const c = porId.get(r.cuenta_id)
            if (c) claves.add(`${normalizar(c.canal)}|${normalizar(c.nombre_perfil)}|${r.fecha}`)
          }
          if (lote.length < 1000) break
        }
      }
    }
    setExistentes(claves)
  }

  const validadas = useMemo<FilaValidada<PublicacionImportada | AuditoriaImportada>[]>(() => {
    if (!tabla || !mapeo || paso === 'archivo' || paso === 'columnas') return []
    return destino === 'publicaciones'
      ? validarPublicaciones(tabla.filas, filaEnc, mapeo, existentes)
      : validarAuditoria(tabla.filas, filaEnc, mapeo, hoy, existentes)
  }, [tabla, mapeo, paso, destino, filaEnc, existentes, hoy])

  const marcasPorNombre = useMemo(() => new Map(activas.map((m) => [normalizar(m.nombre), m.id])), [activas])

  async function pasarARevisar() {
    setError(null)
    const faltan = CAMPOS_DESTINO[destino].filter((c) => c.requerido && mapeo?.campos[c.campo] == null)
    if (faltan.length) return setError(`Indica qué columna contiene: ${faltan.map((c) => c.etiqueta).join(', ')}.`)
    if (!marca) return setError('Primero crea una marca para recibir los datos.')
    setLeyendo(true)
    try {
      await cargarExistentes()
      setPaso('revisar')
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setLeyendo(false)
    }
  }

  const aImportar = validadas.filter((v) => v.datos && (incluirDuplicados || !v.duplicado))
  const conError = validadas.filter((v) => !v.datos)
  const duplicadas = validadas.filter((v) => v.datos && v.duplicado)

  async function importar() {
    setImportando(true)
    setProgreso(0)
    const rechazadas: Rechazo[] = [
      ...conError.map((v) => ({ fila: v.fila, motivo: v.errores.join(' ') })),
      ...(incluirDuplicados ? [] : duplicadas.map((v) => ({ fila: v.fila, motivo: 'Posible duplicado: ya existe una con el mismo título/red y fecha. No se importó.' }))),
    ]
    let importadas = 0
    try {
      if (destino === 'publicaciones') importadas = await importarPublicaciones(aImportar as FilaValidada<PublicacionImportada>[], rechazadas)
      else importadas = await importarAuditoria(aImportar as FilaValidada<AuditoriaImportada>[], rechazadas)
    } catch (e) {
      rechazadas.push({ fila: 0, motivo: `Se detuvo la importación: ${mensajeError(e)}` })
    }
    rechazadas.sort((a, b) => a.fila - b.fila)
    try {
      await supabase.from('importaciones').insert({
        espacio_id: espacio.id,
        usuario_id: sesion?.user.id ?? null,
        archivo: archivo.slice(0, 200),
        hoja: tabla.hoja.slice(0, 100),
        destino,
        filas_importadas: importadas,
        filas_rechazadas: rechazadas.length,
        detalle: rechazadas.slice(0, 500).map((r) => ({ fila: r.fila, motivo: r.motivo.slice(0, 300) })),
      })
    } catch {
      /* el registro del historial no debe impedir ver el resultado */
    }
    cliente.invalidateQueries()
    setResultado({ importadas, rechazadas })
    setImportando(false)
    setPaso('hecho')
    avisar(`Importación terminada: ${importadas} ${importadas === 1 ? 'fila' : 'filas'}.`)
  }

  async function importarPublicaciones(filas: FilaValidada<PublicacionImportada>[], rechazadas: Rechazo[]) {
    let total = 0
    for (let i = 0; i < filas.length; i += LOTE) {
      const lote: { fila: number; datos: PublicacionImportada; marca: string }[] = []
      for (const v of filas.slice(i, i + LOTE)) {
        const d = v.datos!
        const m = d.marca ? marcasPorNombre.get(normalizar(d.marca)) : marca
        if (!m) rechazadas.push({ fila: v.fila, motivo: `La marca «${d.marca}» no existe en este espacio.` })
        else lote.push({ fila: v.fila, datos: d, marca: m })
      }
      if (lote.length) {
        const insertadas = exigir(
          await supabase
            .from('publicaciones')
            .insert(
              lote.map(({ datos: d, marca: m }) => ({
                espacio_id: espacio.id,
                marca_id: m,
                titulo: d.titulo,
                fecha_prevista: d.dia ? aInstante(d.dia, d.hora, espacio.zona_horaria) : null,
                estado: d.estado,
                texto: d.texto,
                hashtags: d.hashtags,
                cta: d.cta,
                categoria: d.categoria,
                etapa: d.etapa,
                tipos: d.tipos,
                info_adicional: d.info_adicional,
                notas: d.notas,
              })),
            )
            .select('id'),
        )
        const canales = insertadas.flatMap((p, k) =>
          lote[k].datos.canales.map((canal) => ({
            publicacion_id: p.id,
            espacio_id: espacio.id,
            canal,
            fecha_publicada: lote[k].datos.estado === 'publicado' && lote[k].datos.dia ? aInstante(lote[k].datos.dia!, lote[k].datos.hora, espacio.zona_horaria) : null,
          })),
        )
        if (canales.length) exigir(await supabase.from('publicacion_canales').insert(canales).select('id'))
        total += insertadas.length
      }
      setProgreso(Math.round(((i + LOTE) / filas.length) * 100))
    }
    return total
  }

  async function importarAuditoria(filas: FilaValidada<AuditoriaImportada>[], rechazadas: Rechazo[]) {
    const cuentas = exigir(await supabase.from('cuentas_red').select('id, canal, nombre_perfil').eq('marca_id', marca))
    const clave = (canal: string, perfil: string) => `${normalizar(canal)}|${normalizar(perfil)}`
    const mapa = new Map(cuentas.map((c) => [clave(c.canal, c.nombre_perfil), c.id]))
    let total = 0
    for (const [n, v] of filas.entries()) {
      const d = v.datos!
      let cuenta = mapa.get(clave(d.canal, d.perfil))
      if (!cuenta) {
        const nueva = exigir(
          await supabase
            .from('cuentas_red')
            .insert({ espacio_id: espacio.id, marca_id: marca, canal: d.canal, nombre_perfil: d.perfil, enlace: d.enlace })
            .select('id')
            .single(),
        )
        cuenta = nueva.id
        mapa.set(clave(d.canal, d.perfil), cuenta)
      }
      const { error } = await supabase.from('registros_auditoria').insert({
        espacio_id: espacio.id,
        cuenta_id: cuenta,
        fecha: d.fecha,
        seguidores: d.seguidores,
        ultima_actividad: d.ultima_actividad,
        frecuencia: d.frecuencia,
        trafico_referencia: d.trafico,
        clics_por_publicacion: d.clics,
        alcance: d.alcance,
      })
      if (error) rechazadas.push({ fila: v.fila, motivo: error.code === '23505' ? 'Ya hay un registro de ese perfil en esa fecha; no se sobrescribe.' : mensajeError(error) })
      else total++
      setProgreso(Math.round(((n + 1) / filas.length) * 100))
    }
    return total
  }

  function reiniciar() {
    setPaso('archivo')
    setTablas([])
    setMapeo(null)
    setResultado(null)
    setError(null)
    setIncluirDuplicados(false)
  }

  return (
    <>
      <Encabezado
        titulo="Importar desde Excel o CSV"
        descripcion="Trae tus plantillas actuales. Nada se sobrescribe: solo se añaden filas nuevas, y antes de guardar ves qué entra y qué no."
      />
      <ol className="mb-6 flex flex-wrap gap-2 text-sm" aria-label="Pasos">
        {(['archivo', 'columnas', 'revisar', 'hecho'] as Paso[]).map((p, i) => (
          <li key={p} aria-current={paso === p ? 'step' : undefined} className={`rounded-full px-3 py-1 ${paso === p ? 'bg-marca-700 text-white' : 'bg-stone-100 text-stone-600'}`}>
            {i + 1}. {{ archivo: 'Archivo', columnas: 'Columnas', revisar: 'Revisar', hecho: 'Resultado' }[p]}
          </li>
        ))}
      </ol>
      {error && (
        <div className="mb-4">
          <Aviso tipo="error">{error}</Aviso>
        </div>
      )}

      {paso === 'archivo' && (
        <Tarjeta>
          {activas.length === 0 && !marcas.isLoading ? (
            <Aviso tipo="alerta">
              Necesitas al menos una marca para importar. <Link className="font-medium underline" to="/marcas">Crear una marca</Link>
            </Aviso>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Selector etiqueta="¿Qué vas a importar?" value={destino} onChange={(e) => setDestino(e.target.value as Destino)}>
                <option value="publicaciones">Publicaciones (Horario, Plan de contenido, Multicanal, Tablero)</option>
                <option value="auditoria">Registros de auditoría de perfiles</option>
              </Selector>
              <Selector etiqueta="Marca que recibe los datos" value={marca} onChange={(e) => setMarcaId(e.target.value)}>
                {activas.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </Selector>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-stone-800" htmlFor="archivo-importar">Archivo (.xlsx o .csv, hasta 15 MB)</label>
                <input
                  id="archivo-importar"
                  type="file"
                  accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  disabled={leyendo}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void leerArchivo(f)
                    e.target.value = ''
                  }}
                  className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-marca-700 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
                />
                {leyendo && <p className="mt-2 text-sm text-stone-500">Leyendo el archivo…</p>}
                <p className="mt-2 text-xs text-stone-500">
                  El archivo se lee en tu navegador; solo se envían a la base de datos las filas que confirmes. Consulta los consejos en <Link className="underline" to="/ayuda#importar">Ayuda</Link>.
                </p>
              </div>
            </div>
          )}
        </Tarjeta>
      )}

      {paso === 'columnas' && tabla && mapeo && (
        <div className="space-y-4">
          <Tarjeta titulo={archivo}>
            <div className="grid gap-4 sm:grid-cols-2">
              {tablas.length > 1 && (
                <Selector etiqueta="Hoja" value={hojaIdx} onChange={(e) => elegirHoja(tablas, Number(e.target.value), destino)}>
                  {tablas.map((t, i) => (
                    <option key={t.hoja + i} value={i}>{t.hoja}</option>
                  ))}
                </Selector>
              )}
              <Selector
                etiqueta="Fila de encabezados"
                ayuda="La fila que tiene los nombres de las columnas. Se detectó sola; cámbiala si no es la correcta."
                value={filaEnc}
                onChange={(e) => cambiarEncabezado(Number(e.target.value))}
              >
                {tabla.filas.slice(0, 20).map((f, i) => (
                  <option key={i} value={i}>
                    Fila {i + 1}: {f.filter((c) => c != null).slice(0, 4).map(mostrar).join(' · ').slice(0, 70) || '(vacía)'}
                  </option>
                ))}
              </Selector>
            </div>
          </Tarjeta>

          <Tarjeta titulo="¿Qué columna es cada dato?" descripcion="Se propuso una correspondencia según los nombres de tus plantillas. Revisa y corrige si hace falta.">
            <div className="grid gap-3 sm:grid-cols-2">
              {CAMPOS_DESTINO[destino].map((c) => (
                <Selector
                  key={c.campo}
                  etiqueta={c.etiqueta + (c.requerido ? ' *' : '')}
                  value={mapeo.campos[c.campo] ?? ''}
                  onChange={(e) => setMapeo({ ...mapeo, campos: { ...mapeo.campos, [c.campo]: e.target.value === '' ? null : Number(e.target.value) } })}
                  ayuda={c.campo === 'marca' ? 'Opcional. Si la usas, cada fila va a la marca con ese nombre; si está vacía, a la marca elegida.' : undefined}
                >
                  <option value="">— No importar —</option>
                  {(tabla.filas[filaEnc] ?? []).map((h, i) => (
                    <option key={i} value={i}>
                      {columnaLetra(i)} · {mostrar(h) || '(sin nombre)'}
                    </option>
                  ))}
                </Selector>
              ))}
            </div>
            {destino === 'publicaciones' && (
              <div className="mt-5 border-t border-stone-100 pt-4">
                <h3 className="text-sm font-semibold">Columnas de redes</h3>
                <p className="mb-3 text-xs text-stone-500">Si la celda tiene cualquier marca («x», «sí», «incógnita»…), la publicación se crea para esa red. Vacío, «no» o «0» = no.</p>
                {mapeo.canales.length === 0 && <p className="text-sm text-stone-600">No se detectaron columnas de redes.</p>}
                <ul className="grid gap-2 sm:grid-cols-2">
                  {mapeo.canales.map((c, k) => (
                    <li key={c.col} className="flex items-end gap-2">
                      <Selector
                        className="flex-1"
                        etiqueta={
                          c.hasta != null && c.hasta > c.col
                            ? `Columnas ${columnaLetra(c.col)}–${columnaLetra(c.hasta)} (bloque «${mostrar(tabla.filas[filaEnc - 1]?.[c.col] ?? null)}»)`
                            : `Columna ${columnaLetra(c.col)} · ${mostrar(tabla.filas[filaEnc]?.[c.col] ?? null) || mostrar(tabla.filas[filaEnc - 1]?.[c.col] ?? null)}`
                        }
                        value={c.canal}
                        onChange={(e) => setMapeo({ ...mapeo, canales: mapeo.canales.map((x, j) => (j === k ? { ...x, canal: e.target.value } : x)) })}
                      >
                        {[...new Set([...CANALES, c.canal])].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </Selector>
                      <Boton variante="fantasma" aria-label={`No usar la columna ${columnaLetra(c.col)}`} onClick={() => setMapeo({ ...mapeo, canales: mapeo.canales.filter((_, j) => j !== k) })}>
                        Quitar
                      </Boton>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-stone-500">En un bloque (varias columnas por red), la red se marca si cualquiera de sus celdas tiene algo.</p>
                {mapeo.formatos.length > 0 && (
                  <>
                    <h3 className="mt-4 text-sm font-semibold">Columnas de formato</h3>
                    <p className="mb-2 text-xs text-stone-500">Una marca en estas columnas añade el formato a la publicación.</p>
                    <ul className="flex flex-wrap gap-2">
                      {mapeo.formatos.map((x, k) => (
                        <li key={x.col} className="flex items-center gap-1 rounded-full bg-stone-100 py-1 pl-3 pr-1 text-sm">
                          {columnaLetra(x.col)} · {x.tipo}
                          <button
                            type="button"
                            className="rounded-full px-2 text-stone-500 hover:bg-stone-200"
                            aria-label={`No usar la columna ${columnaLetra(x.col)} como formato`}
                            onClick={() => setMapeo({ ...mapeo, formatos: mapeo.formatos.filter((_, j) => j !== k) })}
                          >
                            ×
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </Tarjeta>
          <div className="flex flex-wrap gap-2">
            <Boton onClick={() => void pasarARevisar()} cargando={leyendo}>Revisar filas</Boton>
            <Boton variante="secundario" onClick={reiniciar}>Elegir otro archivo</Boton>
          </div>
        </div>
      )}

      {paso === 'revisar' && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Resumen numero={validadas.filter((v) => v.datos && !v.duplicado).length} texto="listas para importar" />
            <Resumen numero={duplicadas.length} texto="posibles duplicados" />
            <Resumen numero={conError.length} texto="con errores (no se importan)" />
          </div>
          {duplicadas.length > 0 && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-0.5" checked={incluirDuplicados} onChange={(e) => setIncluirDuplicados(e.target.checked)} />
              <span>Importar también los posibles duplicados (se crearán como filas nuevas; no se reemplaza nada).</span>
            </label>
          )}
          <Tarjeta titulo="Vista previa">
            <div className="max-h-[28rem] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-white text-xs text-stone-500">
                  <tr>
                    <th className="py-2 pr-3">Fila</th>
                    {destino === 'publicaciones' ? (
                      <>
                        <th className="py-2 pr-3">Título</th>
                        <th className="py-2 pr-3">Fecha</th>
                        <th className="py-2 pr-3">Estado</th>
                        <th className="py-2 pr-3">Redes</th>
                      </>
                    ) : (
                      <>
                        <th className="py-2 pr-3">Red y perfil</th>
                        <th className="py-2 pr-3">Fecha</th>
                        <th className="py-2 pr-3">Seguidores</th>
                      </>
                    )}
                    <th className="py-2">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {validadas.slice(0, 500).map((v) => (
                    <tr key={v.fila} className="border-t border-stone-100 align-top">
                      <td className="py-2 pr-3 tabular-nums text-stone-500">{v.fila}</td>
                      {destino === 'publicaciones' ? (
                        <FilaPub v={v as FilaValidada<PublicacionImportada>} />
                      ) : (
                        <FilaAud v={v as FilaValidada<AuditoriaImportada>} />
                      )}
                      <td className="py-2 text-xs">
                        {v.errores.map((e) => (
                          <p key={e} className="text-red-700">✕ {e}</p>
                        ))}
                        {v.datos && v.duplicado && <p className="text-amber-800">⚠ Posible duplicado</p>}
                        {v.avisos.map((a) => (
                          <p key={a} className="text-stone-600">• {a}</p>
                        ))}
                        {v.datos && !v.duplicado && !v.avisos.length && <p className="text-emerald-700">✓ Lista</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {validadas.length > 500 && <p className="pt-3 text-xs text-stone-500">Se muestran las primeras 500 de {validadas.length} filas; se importan todas.</p>}
              {validadas.length === 0 && <p className="py-4 text-sm text-stone-600">No se encontraron filas con datos debajo de la fila de encabezados.</p>}
            </div>
          </Tarjeta>
          {importando && <p className="text-sm text-stone-600" role="status">Importando… {Math.min(100, progreso)} %</p>}
          <div className="flex flex-wrap gap-2">
            <Boton onClick={() => void importar()} cargando={importando} disabled={aImportar.length === 0}>
              Importar {aImportar.length} {aImportar.length === 1 ? 'fila' : 'filas'}
            </Boton>
            <Boton variante="secundario" disabled={importando} onClick={() => setPaso('columnas')}>Volver a columnas</Boton>
          </div>
        </div>
      )}

      {paso === 'hecho' && resultado && (
        <div className="space-y-4">
          <Aviso tipo={resultado.importadas ? 'exito' : 'alerta'}>
            Se importaron {resultado.importadas} {resultado.importadas === 1 ? 'fila' : 'filas'} y {resultado.rechazadas.length} no se importaron. El resumen queda en el historial de importaciones.
          </Aviso>
          {resultado.rechazadas.length > 0 && (
            <Tarjeta titulo="Filas no importadas">
              <ul className="max-h-80 space-y-1 overflow-auto text-sm">
                {resultado.rechazadas.map((r, i) => (
                  <li key={i}>
                    <span className="font-medium tabular-nums">{r.fila ? `Fila ${r.fila}` : 'General'}:</span> {r.motivo}
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}
          <div className="flex flex-wrap gap-2">
            <Link to={destino === 'publicaciones' ? '/calendario' : '/perfiles'}>
              <Boton>{destino === 'publicaciones' ? 'Ver en el calendario' : 'Ver perfiles y auditoría'}</Boton>
            </Link>
            <Boton variante="secundario" onClick={reiniciar}>Importar otro archivo</Boton>
          </div>
        </div>
      )}

      <Historial espacio={espacio.id} />
    </>
  )
}

function Resumen({ numero, texto }: { numero: number; texto: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-2xl font-semibold tabular-nums">{numero}</p>
      <p className="text-sm text-stone-600">{texto}</p>
    </div>
  )
}

function FilaPub({ v }: { v: FilaValidada<PublicacionImportada> }) {
  const d = v.datos
  return (
    <>
      <td className="py-2 pr-3">{d?.titulo ?? <span className="text-stone-400">—</span>}</td>
      <td className="py-2 pr-3 whitespace-nowrap">{d ? (d.dia ? `${d.dia.split('-').reverse().join('/')} ${d.hora}` : 'Sin fecha') : '—'}</td>
      <td className="py-2 pr-3">{d ? NOMBRE_ESTADO[d.estado] : '—'}</td>
      <td className="py-2 pr-3">{d?.canales.join(', ') || '—'}</td>
    </>
  )
}

function FilaAud({ v }: { v: FilaValidada<AuditoriaImportada> }) {
  const d = v.datos
  return (
    <>
      <td className="py-2 pr-3">{d ? `${d.canal}${d.perfil ? ` · ${d.perfil}` : ''}` : '—'}</td>
      <td className="py-2 pr-3 whitespace-nowrap">{d ? d.fecha.split('-').reverse().join('/') : '—'}</td>
      <td className="py-2 pr-3 tabular-nums">{d?.seguidores?.toLocaleString('es') ?? '—'}</td>
    </>
  )
}

function Historial({ espacio }: { espacio: string }) {
  const [filas, setFilas] = useState<{ id: string; archivo: string; destino: string; filas_importadas: number; filas_rechazadas: number; creado_en: string }[] | null>(null)
  const [abierto, setAbierto] = useState(false)
  async function cargar() {
    setAbierto(true)
    const { data } = await supabase
      .from('importaciones')
      .select('id, archivo, destino, filas_importadas, filas_rechazadas, creado_en')
      .eq('espacio_id', espacio)
      .order('creado_en', { ascending: false })
      .limit(20)
    setFilas(data ?? [])
  }
  return (
    <div className="mt-8">
      {!abierto ? (
        <Boton variante="fantasma" onClick={() => void cargar()}>Ver historial de importaciones</Boton>
      ) : (
        <Tarjeta titulo="Últimas importaciones">
          {filas === null ? (
            <p className="text-sm text-stone-500">Cargando…</p>
          ) : filas.length === 0 ? (
            <p className="text-sm text-stone-600">Todavía no hay importaciones.</p>
          ) : (
            <ul className="divide-y divide-stone-100 text-sm">
              {filas.map((f) => (
                <li key={f.id} className="flex flex-wrap justify-between gap-2 py-2">
                  <span>
                    {f.archivo} <span className="text-stone-500">· {f.destino === 'publicaciones' ? 'publicaciones' : 'auditoría'}</span>
                  </span>
                  <span className="text-stone-600">
                    {f.filas_importadas} importadas, {f.filas_rechazadas} no · {new Date(f.creado_en).toLocaleString('es')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      )}
    </div>
  )
}
