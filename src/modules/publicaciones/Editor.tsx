import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/datos/supabase'
import { exigir, mensajeError } from '../../lib/datos/errores'
import type { PublicacionCanal } from '../../lib/datos/tipos-bd'
import { puede } from '../../lib/roles'
import { CANALES, LIMITE_CARACTERES } from '../../lib/canales'
import { ESTADOS, ETAPAS, contarCaracteres, estaAtrasada, excedeLimite, type Estado, type Etapa } from '../../lib/calculos/publicaciones'
import { aInstante, partesLocales } from '../../lib/calculos/calendario'
import { Areatexto, Aviso, Boton, Campo, Cargando, DialogoConfirmar, Selector, Tarjeta, useNotas } from '../../components/ui'
import { useEspacio } from '../../app/espacio'
import { nombreDe, useMiembros } from '../../app/miembros'
import { useMarcas } from '../marcas/datos'
import { clavesPub, useCategoriasUsadas, usePublicacion } from './datos'
import { AccionesRevision, HiloComentarios } from '../revision/componentes'
import Resultados from '../metricas/Resultados'
import { useCampanas } from '../campanas/Campanas'
import { useCuentas } from '../auditoria/Perfiles'
import { AYUDA_ESTADO, CATEGORIAS_SUGERIDAS, NOMBRE_ESTADO, NOMBRE_ETAPA, TIPOS } from './catalogos'

type CanalForm = { texto_adaptado: string; kpi_esperado: string; enlace_publicado: string; fecha_publicada: string; notas: string }
const canalVacio: CanalForm = { texto_adaptado: '', kpi_esperado: '', enlace_publicado: '', fecha_publicada: '', notas: '' }

type Form = {
  marca_id: string
  titulo: string
  estado: Estado
  dia: string
  hora: string
  responsable_id: string
  tipos: string[]
  texto: string
  hashtags: string
  cta: string
  recursos: string
  categoria: string
  etapa: Etapa | ''
  campana_id: string
  info_adicional: string
  notas: string
  canales: Record<string, CanalForm>
}

const enlaceValido = (v: string) => v === '' || /^https?:\/\/\S+$/i.test(v.trim())

export default function Editor() {
  const { id } = useParams()
  const esNueva = !id
  const [params] = useSearchParams()
  const { actual } = useEspacio()
  const espacio = actual!.id
  const zona = actual!.zona_horaria
  const editable = puede.editar(actual?.rol)
  const navegar = useNavigate()
  const qc = useQueryClient()
  const avisar = useNotas()

  const marcas = useMarcas(espacio)
  const miembros = useMiembros(espacio)
  const categoriasUsadas = useCategoriasUsadas(espacio)
  const existente = usePublicacion(id)
  const campanas = useCampanas(espacio)
  const cuentas = useCuentas(espacio)

  const [f, setF] = useState<Form | null>(null)
  const [original, setOriginal] = useState<string>('')
  const [borrando, setBorrando] = useState(false)
  const [intentado, setIntentado] = useState(false)

  // Cargar el formulario
  useEffect(() => {
    if (esNueva) {
      if (!marcas.data || f) return
      const activas = marcas.data.filter((m) => !m.archivada)
      const marcaParam = params.get('marca')
      const dia = /^\d{4}-\d{2}-\d{2}$/.test(params.get('fecha') ?? '') ? params.get('fecha')! : ''
      const inicial: Form = {
        marca_id: activas.find((m) => m.id === marcaParam)?.id ?? activas[0]?.id ?? '',
        titulo: '',
        estado: dia ? 'borrador' : 'idea',
        dia,
        hora: '09:00',
        responsable_id: '',
        tipos: [],
        texto: '',
        hashtags: '',
        cta: '',
        recursos: '',
        categoria: '',
        etapa: '',
        campana_id: params.get('campana') ?? '',
        info_adicional: '',
        notas: '',
        canales: {},
      }
      setF(inicial)
      setOriginal(JSON.stringify(inicial))
      return
    }
    if (!existente.data) return
    const { publicacion: p, canales } = existente.data
    const local = p.fecha_prevista ? partesLocales(p.fecha_prevista, zona) : { dia: '', hora: '09:00' }
    const cargado: Form = {
      marca_id: p.marca_id,
      titulo: p.titulo,
      estado: p.estado,
      dia: local.dia,
      hora: local.hora,
      responsable_id: p.responsable_id ?? '',
      tipos: p.tipos,
      texto: p.texto,
      hashtags: p.hashtags,
      cta: p.cta,
      recursos: p.recursos,
      categoria: p.categoria,
      etapa: p.etapa ?? '',
      campana_id: p.campana_id ?? '',
      info_adicional: p.info_adicional,
      notas: p.notas,
      canales: Object.fromEntries(
        canales.map((c: PublicacionCanal) => {
          const fp = c.fecha_publicada ? partesLocales(c.fecha_publicada, zona) : null
          return [
            c.canal,
            {
              texto_adaptado: c.texto_adaptado,
              kpi_esperado: c.kpi_esperado,
              enlace_publicado: c.enlace_publicado,
              fecha_publicada: fp ? `${fp.dia}T${fp.hora}` : '',
              notas: c.notas,
            },
          ]
        }),
      ),
    }
    setF(cargado)
    setOriginal(JSON.stringify(cargado))
  }, [esNueva, marcas.data, existente.data, zona]) // eslint-disable-line react-hooks/exhaustive-deps

  const sucio = f !== null && JSON.stringify(f) !== original
  useEffect(() => {
    const avisarSalida = (e: BeforeUnloadEvent) => {
      if (sucio) e.preventDefault()
    }
    window.addEventListener('beforeunload', avisarSalida)
    return () => window.removeEventListener('beforeunload', avisarSalida)
  }, [sucio])

  const caracteres = useMemo(() => (f ? contarCaracteres(f.texto, f.hashtags) : 0), [f])

  const guardar = useMutation({
    mutationFn: async (form: Form) => {
      const datos = {
        marca_id: form.marca_id,
        titulo: form.titulo.trim(),
        estado: form.estado,
        fecha_prevista: form.dia ? aInstante(form.dia, form.hora || '09:00', zona) : null,
        responsable_id: form.responsable_id || null,
        tipos: form.tipos,
        texto: form.texto,
        hashtags: form.hashtags.trim(),
        cta: form.cta.trim(),
        recursos: form.recursos.trim(),
        categoria: form.categoria.trim(),
        etapa: form.etapa || null,
        campana_id: form.campana_id || null,
        info_adicional: form.info_adicional.trim(),
        notas: form.notas.trim(),
      }
      let pubId = id
      if (esNueva) {
        pubId = exigir(await supabase.from('publicaciones').insert({ ...datos, espacio_id: espacio }).select('id').single()).id
      } else {
        const r = exigir(await supabase.from('publicaciones').update(datos).eq('id', id!).select('id'))
        if (r.length === 0) throw { code: '42501' }
      }
      const elegidos = Object.keys(form.canales)
      if (elegidos.length > 0) {
        exigir(
          await supabase
            .from('publicacion_canales')
            .upsert(
              elegidos.map((canal) => {
                const c = form.canales[canal]
                const [d, h] = c.fecha_publicada.split('T')
                return {
                  publicacion_id: pubId!,
                  espacio_id: espacio,
                  canal,
                  texto_adaptado: c.texto_adaptado,
                  kpi_esperado: c.kpi_esperado.trim(),
                  enlace_publicado: c.enlace_publicado.trim(),
                  fecha_publicada: d ? aInstante(d, h || '09:00', zona) : null,
                  notas: c.notas.trim(),
                }
              }),
              { onConflict: 'publicacion_id,canal' },
            )
            .select('id'),
        )
      }
      let borrar = supabase.from('publicacion_canales').delete().eq('publicacion_id', pubId!)
      if (elegidos.length > 0) borrar = borrar.not('canal', 'in', `(${elegidos.map((c) => `"${c.replace(/"/g, '')}"`).join(',')})`)
      const { error } = await borrar
      if (error) throw error
      return pubId!
    },
    onSuccess: (pubId, form) => {
      setOriginal(JSON.stringify(form))
      qc.invalidateQueries({ queryKey: clavesPub.todas(espacio) })
      qc.invalidateQueries({ queryKey: clavesPub.una(pubId) })
      qc.invalidateQueries({ queryKey: ['categorias', espacio] })
      avisar(esNueva ? 'Publicación creada.' : 'Cambios guardados.')
      if (esNueva) navegar(`/publicaciones/${pubId}`, { replace: true })
    },
    onError: (e) => avisar(mensajeError(e), 'error'),
  })

  const borrar = useMutation({
    mutationFn: async () => {
      const r = exigir(await supabase.from('publicaciones').delete().eq('id', id!).select('id'))
      if (r.length === 0) throw { code: '42501' }
    },
    onSuccess: () => {
      setOriginal(JSON.stringify(f))
      qc.invalidateQueries({ queryKey: clavesPub.todas(espacio) })
      avisar('Publicación borrada.')
      navegar('/calendario', { replace: true })
    },
    onError: (e) => avisar(mensajeError(e), 'error'),
  })

  if (!esNueva && existente.isPending) return <Cargando />
  if (!esNueva && existente.error) return <Aviso tipo="error">{mensajeError(existente.error)}</Aviso>
  if (!esNueva && (!existente.data || existente.data.publicacion.espacio_id !== espacio)) {
    return (
      <div className="space-y-4">
        <Aviso tipo="error">Esta publicación no existe o pertenece a otro espacio de trabajo.</Aviso>
        <Link className="text-sm text-marca-700 hover:underline" to="/calendario">
          Volver al calendario
        </Link>
      </div>
    )
  }
  if (esNueva && !editable) return <Aviso tipo="error">Tu rol no permite crear publicaciones.</Aviso>
  if (esNueva && marcas.data && marcas.data.filter((m) => !m.archivada).length === 0) {
    return (
      <Aviso>
        Para crear una publicación necesitas al menos una marca activa.{' '}
        <Link className="font-medium underline" to="/marcas">
          Ir a marcas
        </Link>
      </Aviso>
    )
  }
  if (!f) return <Cargando />

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF({ ...f, [k]: v })
  const setCanal = (canal: string, k: keyof CanalForm, v: string) =>
    setF({ ...f, canales: { ...f.canales, [canal]: { ...f.canales[canal], [k]: v } } })
  const alternarCanal = (canal: string) => {
    const nuevos = { ...f.canales }
    const guardado = existente.data?.canales.some((c) => c.canal === canal)
    if (nuevos[canal] && guardado && !window.confirm(`Si quitas ${canal} y guardas, se borrarán sus datos y resultados registrados. ¿Quitarla?`)) return
    if (nuevos[canal]) delete nuevos[canal]
    else nuevos[canal] = { ...canalVacio }
    setF({ ...f, canales: nuevos })
  }

  const errTitulo = !f.titulo.trim() ? 'Escribe un título o tema.' : null
  const errFecha = f.estado === 'programado' && !f.dia ? 'Para programar necesitas una fecha.' : null
  const errEnlaces = Object.entries(f.canales).filter(([, c]) => !enlaceValido(c.enlace_publicado)).map(([k]) => k)
  const valido = !errTitulo && !errFecha && errEnlaces.length === 0 && f.marca_id

  const atrasada =
    !esNueva &&
    f.dia !== '' &&
    estaAtrasada({ estado: f.estado, fechaPrevista: aInstante(f.dia, f.hora || '09:00', zona) }, new Date())
  const avisosLimite = Object.keys(f.canales)
    .map((c) => {
      const lim = LIMITE_CARACTERES[c]
      const n = f.canales[c].texto_adaptado.trim() ? contarCaracteres(f.canales[c].texto_adaptado, f.hashtags) : caracteres
      return lim && excedeLimite(n, lim) ? `${c}: ${n} de ${lim}` : null
    })
    .filter(Boolean)

  const redesDisponibles = [
    ...CANALES,
    ...[...new Set([...(cuentas.data ?? []).filter((c) => c.marca_id === f.marca_id).map((c) => c.canal), ...Object.keys(f.canales)])].filter(
      (c) => !(CANALES as readonly string[]).includes(c),
    ),
  ]
  const categorias = [...new Set([...CATEGORIAS_SUGERIDAS, ...(categoriasUsadas.data ?? [])])].sort((a, b) => a.localeCompare(b, 'es'))

  function enviar(e: FormEvent) {
    e.preventDefault()
    setIntentado(true)
    if (valido && f) guardar.mutate(f)
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-6 pb-24">
      <div>
        <Link
          to={f.dia ? `/calendario?fecha=${f.dia}` : '/calendario'}
          className="text-sm text-marca-700 hover:underline"
          onClick={(e) => {
            if (sucio && !window.confirm('Tienes cambios sin guardar. ¿Salir de todas formas?')) e.preventDefault()
          }}
        >
          ← Calendario
        </Link>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">{esNueva ? 'Nueva publicación' : f.titulo || 'Publicación'}</h1>
        {!editable && <p className="mt-1 text-sm text-stone-600">Solo lectura: tu rol no permite editar publicaciones.</p>}
      </div>

      {atrasada && <Aviso tipo="error">Esta publicación está atrasada: su fecha ya pasó y aún no se publica.</Aviso>}

      <fieldset disabled={!editable} className="space-y-6">
        <Tarjeta titulo="Lo básico">
          <div className="grid gap-4 sm:grid-cols-2">
            <Areatexto
              className="sm:col-span-2"
              etiqueta="Título o tema"
              rows={2}
              required
              maxLength={200}
              value={f.titulo}
              onChange={(e) => set('titulo', e.target.value)}
              error={intentado ? errTitulo : null}
              ayuda="La idea en una frase. Es lo que verás en el calendario."
            />
            <Selector
              etiqueta="Marca"
              value={f.marca_id}
              onChange={(e) => {
                const nueva = e.target.value
                const sigue = campanas.data?.some((c) => c.id === f.campana_id && c.marca_id === nueva)
                setF({ ...f, marca_id: nueva, campana_id: sigue ? f.campana_id : '' })
              }}
            >
              {(marcas.data ?? [])
                .filter((m) => !m.archivada || m.id === f.marca_id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
            </Selector>
            <Selector etiqueta="Estado" value={f.estado} onChange={(e) => set('estado', e.target.value as Estado)} ayuda={AYUDA_ESTADO[f.estado]}>
              {ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {NOMBRE_ESTADO[s]}
                </option>
              ))}
            </Selector>
            <div className="grid grid-cols-[1fr_7rem] gap-2">
              <Campo
                etiqueta="Fecha prevista"
                type="date"
                value={f.dia}
                onChange={(e) => set('dia', e.target.value)}
                error={intentado ? errFecha : null}
                ayuda={f.dia ? undefined : 'Sin fecha queda en el banco de ideas.'}
              />
              <Campo etiqueta="Hora" type="time" value={f.hora} disabled={!f.dia} onChange={(e) => set('hora', e.target.value)} />
            </div>
            <Selector etiqueta="Responsable" value={f.responsable_id} onChange={(e) => set('responsable_id', e.target.value)}>
              <option value="">Sin asignar</option>
              {(miembros.data ?? []).map((m) => (
                <option key={m.usuario_id} value={m.usuario_id}>
                  {nombreDe(m)}
                </option>
              ))}
              {f.responsable_id && miembros.data && !miembros.data.some((m) => m.usuario_id === f.responsable_id) && (
                <option value={f.responsable_id}>(ya no es miembro)</option>
              )}
            </Selector>
          </div>
          {f.dia && <p className="mt-2 text-xs text-stone-500">Hora de {zona.replaceAll('_', ' ')}.</p>}
        </Tarjeta>

        <Tarjeta titulo="Contenido">
          <div className="space-y-4">
            <fieldset>
              <legend className="mb-1 text-sm font-medium text-stone-800">Formato</legend>
              <div className="flex flex-wrap gap-2">
                {TIPOS.map((t) => {
                  const activo = f.tipos.includes(t)
                  return (
                    <label
                      key={t}
                      className={
                        'cursor-pointer rounded-full border px-3 py-1 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-marca-600 ' +
                        (activo ? 'border-marca-700 bg-marca-50 text-marca-800' : 'border-stone-300 bg-white text-stone-700')
                      }
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={activo}
                        onChange={() => set('tipos', activo ? f.tipos.filter((x) => x !== t) : [...f.tipos, t])}
                      />
                      {t}
                    </label>
                  )
                })}
              </div>
            </fieldset>
            <Areatexto
              etiqueta="Texto (copy)"
              rows={6}
              maxLength={10000}
              value={f.texto}
              onChange={(e) => set('texto', e.target.value)}
            />
            <Campo
              etiqueta="Hashtags"
              maxLength={1000}
              placeholder="#emprendimiento #redes"
              value={f.hashtags}
              onChange={(e) => set('hashtags', e.target.value)}
            />
            <p className="text-xs text-stone-600" aria-live="polite">
              {caracteres} caracteres con hashtags.
              {avisosLimite.length > 0 && <span className="ml-1 font-medium text-red-700">Supera el límite en: {avisosLimite.join(' · ')}.</span>}
            </p>
            <Campo
              etiqueta="Llamado a la acción"
              maxLength={300}
              placeholder="Ej.: Escríbenos por WhatsApp"
              value={f.cta}
              onChange={(e) => set('cta', e.target.value)}
            />
            <Areatexto
              etiqueta="Recursos visuales"
              rows={2}
              maxLength={3000}
              placeholder="Enlaces a imágenes, videos o diseños (uno por línea)"
              value={f.recursos}
              onChange={(e) => set('recursos', e.target.value)}
            />
          </div>
        </Tarjeta>

        <Tarjeta titulo="Redes" descripcion="Marca dónde se publicará. Para cada red puedes adaptar el texto, poner la meta (KPI) y, al publicar, el enlace.">
          <div className="flex flex-wrap gap-2">
            {redesDisponibles.map((c) => {
              const activo = Boolean(f.canales[c])
              return (
                <label
                  key={c}
                  className={
                    'cursor-pointer rounded-full border px-3 py-1 text-sm has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-marca-600 ' +
                    (activo ? 'border-marca-700 bg-marca-700 text-white' : 'border-stone-300 bg-white text-stone-700')
                  }
                >
                  <input type="checkbox" className="sr-only" checked={activo} onChange={() => alternarCanal(c)} />
                  {c}
                </label>
              )
            })}
          </div>
          {Object.keys(f.canales).length > 0 && (
            <div className="mt-4 space-y-3">
              {Object.keys(f.canales)
                .sort((a, b) => redesDisponibles.indexOf(a) - redesDisponibles.indexOf(b))
                .map((c) => {
                  const datos = f.canales[c]
                  const lim = LIMITE_CARACTERES[c]
                  const n = datos.texto_adaptado.trim() ? contarCaracteres(datos.texto_adaptado, f.hashtags) : caracteres
                  return (
                    <details key={c} className="rounded-lg border border-stone-200 p-3" open={Boolean(datos.enlace_publicado || datos.texto_adaptado)}>
                      <summary className="cursor-pointer text-sm font-medium">
                        {c}
                        {lim && (
                          <span className={'ml-2 text-xs font-normal ' + (excedeLimite(n, lim) ? 'text-red-700' : 'text-stone-500')}>
                            {n} / {lim}
                          </span>
                        )}
                        {datos.enlace_publicado && <span className="ml-2 text-xs font-normal text-emerald-700">publicado</span>}
                      </summary>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <Areatexto
                          className="sm:col-span-2"
                          etiqueta="Texto adaptado para esta red"
                          rows={3}
                          maxLength={10000}
                          placeholder="Vacío = se usa el texto general"
                          value={datos.texto_adaptado}
                          onChange={(e) => setCanal(c, 'texto_adaptado', e.target.value)}
                        />
                        <Campo
                          etiqueta="KPI esperado"
                          maxLength={200}
                          placeholder="Ej.: 500 me gusta"
                          value={datos.kpi_esperado}
                          onChange={(e) => setCanal(c, 'kpi_esperado', e.target.value)}
                        />
                        <Campo
                          etiqueta="Fecha en que se publicó"
                          type="datetime-local"
                          value={datos.fecha_publicada}
                          onChange={(e) => setCanal(c, 'fecha_publicada', e.target.value)}
                        />
                        <Campo
                          className="sm:col-span-2"
                          etiqueta="Enlace a la publicación"
                          type="url"
                          placeholder="https://"
                          value={datos.enlace_publicado}
                          onChange={(e) => setCanal(c, 'enlace_publicado', e.target.value)}
                          error={!enlaceValido(datos.enlace_publicado) ? 'Debe empezar por https:// o http://' : null}
                        />
                        {datos.enlace_publicado && enlaceValido(datos.enlace_publicado) && (
                          <a
                            href={datos.enlace_publicado}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-marca-700 hover:underline sm:col-span-2"
                          >
                            Abrir publicación en {c} ↗
                          </a>
                        )}
                        <Campo
                          className="sm:col-span-2"
                          etiqueta="Notas"
                          maxLength={2000}
                          value={datos.notas}
                          onChange={(e) => setCanal(c, 'notas', e.target.value)}
                        />
                      </div>
                    </details>
                  )
                })}
            </div>
          )}
        </Tarjeta>

        <Tarjeta titulo="Planificación">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Campo
                etiqueta="Categoría"
                list="categorias-publicacion"
                maxLength={60}
                placeholder="Elige o escribe una"
                value={f.categoria}
                onChange={(e) => set('categoria', e.target.value)}
              />
              <datalist id="categorias-publicacion">
                {categorias.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <Selector
              etiqueta="Campaña"
              value={f.campana_id}
              onChange={(e) => set('campana_id', e.target.value)}
              ayuda="Solo campañas de la misma marca."
            >
              <option value="">Ninguna</option>
              {(campanas.data ?? [])
                .filter((c) => c.marca_id === f.marca_id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
            </Selector>
            <Selector
              etiqueta="Etapa del embudo"
              value={f.etapa}
              onChange={(e) => set('etapa', e.target.value as Etapa | '')}
              ayuda="En qué momento del cliente actúa: descubrirte, investigar, decidir, comprar o volver."
            >
              <option value="">Sin definir</option>
              {ETAPAS.map((s) => (
                <option key={s} value={s}>
                  {NOMBRE_ETAPA[s]}
                </option>
              ))}
            </Selector>
            <Areatexto
              className="sm:col-span-2"
              etiqueta="Información adicional"
              rows={2}
              maxLength={2000}
              value={f.info_adicional}
              onChange={(e) => set('info_adicional', e.target.value)}
            />
            <Areatexto
              className="sm:col-span-2"
              etiqueta="Notas internas"
              rows={2}
              maxLength={3000}
              value={f.notas}
              onChange={(e) => set('notas', e.target.value)}
            />
          </div>
        </Tarjeta>
      </fieldset>

      {!esNueva && <AccionesRevision publicacion={id!} estado={existente.data!.publicacion.estado} haySinGuardar={sucio} />}
      {!esNueva && (
        <Resultados publicacion={id!} canales={existente.data!.canales} editable={editable} />
      )}
      {!esNueva && <HiloComentarios publicacion={id!} />}

      {editable && !esNueva && (
        <Tarjeta titulo="Borrar publicación" descripcion="Si solo no se va a publicar, cambia el estado a «Descartado» para conservar el historial.">
          <Boton variante="peligro" onClick={() => setBorrando(true)}>
            Borrar definitivamente
          </Boton>
        </Tarjeta>
      )}

      {editable && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stone-200 bg-white/95 px-4 py-3 backdrop-blur lg:left-64">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-end gap-3">
            {intentado && !valido && (
              <span className="mr-auto text-sm text-red-700">
                {errTitulo ?? errFecha ?? (errEnlaces.length ? `Revisa el enlace de ${errEnlaces.join(', ')}.` : 'Elige una marca.')}
              </span>
            )}
            {!intentado || valido ? <span className="mr-auto text-xs text-stone-500">{sucio ? 'Cambios sin guardar' : esNueva ? '' : 'Todo guardado'}</span> : null}
            <Boton type="submit" cargando={guardar.isPending} disabled={!sucio && !esNueva}>
              {esNueva ? 'Crear publicación' : 'Guardar cambios'}
            </Boton>
          </div>
        </div>
      )}

      <DialogoConfirmar
        abierto={borrando}
        titulo="¿Borrar esta publicación?"
        textoConfirmar="Borrar"
        peligro
        cargando={borrar.isPending}
        onCerrar={() => setBorrando(false)}
        onConfirmar={() => borrar.mutate()}
      >
        <p>Se borran la publicación y sus datos por red. No se puede deshacer.</p>
      </DialogoConfirmar>
    </form>
  )
}
