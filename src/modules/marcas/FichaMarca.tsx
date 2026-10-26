import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/datos/supabase'
import { exigir, mensajeError } from '../../lib/datos/errores'
import type { Marca } from '../../lib/datos/tipos-bd'
import { puede } from '../../lib/roles'
import { Areatexto, Aviso, Boton, Campo, Cargando, DialogoConfirmar, Tarjeta, useNotas } from '../../components/ui'
import { useEspacio } from '../../app/espacio'
import { claves, useEstrategia, useMarca, useObjetivos } from './datos'
import Estrategia from './Estrategia'

const PESTANAS = [
  { id: 'estrategia', texto: 'Estrategia' },
  { id: 'datos', texto: 'Datos de la marca' },
] as const

export default function FichaMarca() {
  const { id = '' } = useParams()
  const { actual } = useEspacio()
  const [params, setParams] = useSearchParams()
  const pestana = params.get('ver') === 'datos' ? 'datos' : 'estrategia'
  const marca = useMarca(id)
  const estrategia = useEstrategia(id)
  const objetivos = useObjetivos(id)
  const editable = puede.editar(actual?.rol)

  if (marca.isPending) return <Cargando />
  if (marca.error) return <Aviso tipo="error">{mensajeError(marca.error)}</Aviso>
  if (!marca.data || marca.data.espacio_id !== actual?.id) {
    return (
      <div className="space-y-4">
        <Aviso tipo="error">Esta marca no existe o pertenece a otro espacio de trabajo.</Aviso>
        <Link className="text-sm text-marca-700 hover:underline" to="/marcas">
          Volver a marcas
        </Link>
      </div>
    )
  }
  const m = marca.data

  return (
    <div className="space-y-6">
      <div>
        <Link to="/marcas" className="text-sm text-marca-700 hover:underline">
          ← Marcas
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span aria-hidden className="size-5 rounded-full" style={{ backgroundColor: m.color }} />
          <h1 className="text-xl font-semibold tracking-tight">{m.nombre}</h1>
          {m.archivada && <span className="rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-medium text-stone-700">Archivada</span>}
        </div>
        {m.descripcion && <p className="mt-1 text-sm text-stone-600">{m.descripcion}</p>}
      </div>

      <div role="tablist" aria-label="Secciones de la marca" className="flex gap-1 border-b border-stone-200">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            role="tab"
            type="button"
            aria-selected={pestana === p.id}
            onClick={() => setParams(p.id === 'estrategia' ? {} : { ver: p.id }, { replace: true })}
            className={
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium ' +
              (pestana === p.id ? 'border-marca-700 text-marca-800' : 'border-transparent text-stone-600 hover:text-stone-900')
            }
          >
            {p.texto}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {pestana === 'estrategia' &&
          (estrategia.isPending ? (
            <Cargando />
          ) : estrategia.error || !estrategia.data ? (
            <Aviso tipo="error">{mensajeError(estrategia.error)}</Aviso>
          ) : (
            <Estrategia
              marca={m.id}
              espacio={m.espacio_id}
              estrategia={estrategia.data}
              editable={editable}
              cantidadObjetivos={objetivos.data?.length ?? 0}
              zona={actual.zona_horaria}
            />
          ))}
        {pestana === 'datos' && <DatosMarca marca={m} />}
      </div>
    </div>
  )
}

function DatosMarca({ marca }: { marca: Marca }) {
  const { actual } = useEspacio()
  const editable = puede.editar(actual?.rol)
  const esAdmin = puede.administrarEspacio(actual?.rol)
  const qc = useQueryClient()
  const avisar = useNotas()
  const navegar = useNavigate()
  const [f, setF] = useState(marca)
  const [borrando, setBorrando] = useState(false)
  const [confirmacion, setConfirmacion] = useState('')

  useEffect(() => setF(marca), [marca])

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: claves.marca(marca.id) })
    qc.invalidateQueries({ queryKey: claves.marcas(marca.espacio_id) })
  }

  const guardar = useMutation({
    mutationFn: async (cambio: Partial<Marca>) => {
      const r = exigir(await supabase.from('marcas').update(cambio).eq('id', marca.id).select())
      if (r.length === 0) throw { code: '42501' }
    },
    onSuccess: (_d, cambio) => {
      avisar('archivada' in cambio ? (cambio.archivada ? 'Marca archivada.' : 'Marca restaurada.') : 'Cambios guardados.')
      refrescar()
    },
    onError: (e) => {
      const err = e as { code?: string }
      avisar(err.code === '23505' ? 'Ya existe una marca con ese nombre en este espacio.' : mensajeError(e), 'error')
    },
  })

  const borrar = useMutation({
    mutationFn: async () => {
      const r = exigir(await supabase.from('marcas').delete().eq('id', marca.id).select())
      if (r.length === 0) throw { code: '42501' }
    },
    onSuccess: () => {
      avisar('Marca borrada.')
      qc.invalidateQueries({ queryKey: claves.marcas(marca.espacio_id) })
      navegar('/marcas', { replace: true })
    },
    onError: (e) => avisar(mensajeError(e), 'error'),
  })

  const cambios =
    f.nombre.trim() !== marca.nombre ||
    f.descripcion !== marca.descripcion ||
    f.color !== marca.color ||
    f.tono !== marca.tono ||
    f.publico_objetivo !== marca.publico_objetivo ||
    f.frecuencia_publicacion !== marca.frecuencia_publicacion

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (!f.nombre.trim() || !cambios) return
    guardar.mutate({
      nombre: f.nombre.trim(),
      descripcion: f.descripcion.trim(),
      color: f.color,
      tono: f.tono.trim(),
      publico_objetivo: f.publico_objetivo.trim(),
      frecuencia_publicacion: f.frecuencia_publicacion.trim(),
    })
  }

  return (
    <div className="space-y-6">
      {!editable && <Aviso>Solo lectura: tu rol no permite editar la marca.</Aviso>}
      <Tarjeta titulo="Identidad de la marca">
        <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-[1fr_auto]" noValidate>
          <Campo
            etiqueta="Nombre"
            required
            maxLength={80}
            disabled={!editable}
            value={f.nombre}
            onChange={(e) => setF({ ...f, nombre: e.target.value })}
            error={!f.nombre.trim() ? 'El nombre no puede quedar vacío.' : null}
          />
          <div>
            <label htmlFor="color-ficha" className="mb-1 block text-sm font-medium text-stone-800">
              Color
            </label>
            <input
              id="color-ficha"
              type="color"
              disabled={!editable}
              value={f.color}
              onChange={(e) => setF({ ...f, color: e.target.value })}
              className="h-10 w-20 cursor-pointer rounded-lg border border-stone-300 bg-white p-1 disabled:cursor-not-allowed"
            />
          </div>
          <Areatexto
            className="sm:col-span-2"
            etiqueta="Descripción"
            maxLength={2000}
            readOnly={!editable}
            value={f.descripcion}
            onChange={(e) => setF({ ...f, descripcion: e.target.value })}
          />
          <Areatexto
            className="sm:col-span-2"
            etiqueta="Tono de comunicación"
            rows={2}
            maxLength={500}
            readOnly={!editable}
            placeholder="Ej.: cercano, inspirador, con humor; tuteo; sin tecnicismos"
            value={f.tono}
            onChange={(e) => setF({ ...f, tono: e.target.value })}
          />
          <Areatexto
            className="sm:col-span-2"
            etiqueta="Público objetivo"
            maxLength={2000}
            readOnly={!editable}
            value={f.publico_objetivo}
            onChange={(e) => setF({ ...f, publico_objetivo: e.target.value })}
            ayuda="Resumen para quien crea contenido. El análisis completo va en la estrategia."
          />
          <Campo
            className="sm:col-span-2"
            etiqueta="Frecuencia de publicación"
            maxLength={200}
            disabled={!editable}
            placeholder="Ej.: Instagram 4 por semana, TikTok diario"
            value={f.frecuencia_publicacion}
            onChange={(e) => setF({ ...f, frecuencia_publicacion: e.target.value })}
          />
          {editable && (
            <div className="sm:col-span-2">
              <Boton type="submit" cargando={guardar.isPending && !('archivada' in (guardar.variables ?? {}))} disabled={!cambios || !f.nombre.trim()}>
                Guardar cambios
              </Boton>
            </div>
          )}
        </form>
      </Tarjeta>

      {editable && (
        <Tarjeta
          titulo={marca.archivada ? 'Restaurar la marca' : 'Archivar la marca'}
          descripcion={
            marca.archivada
              ? 'Vuelve a aparecer en la lista de marcas activas.'
              : 'Deja de aparecer en la lista activa, pero conserva todos sus datos. Se puede restaurar cuando quieras.'
          }
        >
          <Boton variante="secundario" cargando={guardar.isPending && 'archivada' in (guardar.variables ?? {})} onClick={() => guardar.mutate({ archivada: !marca.archivada })}>
            {marca.archivada ? 'Restaurar' : 'Archivar'}
          </Boton>
        </Tarjeta>
      )}

      {esAdmin && (
        <Tarjeta titulo="Borrar la marca" descripcion="Borra la marca, su estrategia y sus objetivos para todos. No se puede deshacer.">
          <Boton variante="peligro" onClick={() => setBorrando(true)}>
            Borrar marca
          </Boton>
        </Tarjeta>
      )}

      <DialogoConfirmar
        abierto={borrando}
        titulo="¿Borrar esta marca para siempre?"
        textoConfirmar="Borrar para siempre"
        peligro
        cargando={borrar.isPending}
        confirmarDeshabilitado={confirmacion.trim() !== marca.nombre}
        onCerrar={() => {
          setBorrando(false)
          setConfirmacion('')
        }}
        onConfirmar={() => borrar.mutate()}
      >
        <p>Si solo quieres ocultarla, usa «Archivar». Para borrar, escribe el nombre exacto.</p>
        <Campo className="mt-4" etiqueta={`Escribe «${marca.nombre}»`} value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} />
      </DialogoConfirmar>
    </div>
  )
}
