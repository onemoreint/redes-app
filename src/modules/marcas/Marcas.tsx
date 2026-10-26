import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/datos/supabase'
import { exigir, mensajeError } from '../../lib/datos/errores'
import { puede } from '../../lib/roles'
import { progresoEstrategia } from '../../lib/calculos/estrategia'
import { Aviso, BarraProgreso, Boton, Campo, Cargando, Encabezado, Tarjeta, useNotas } from '../../components/ui'
import { useEspacio } from '../../app/espacio'
import { claves, useMarcas, useProgresos } from './datos'

export default function Marcas() {
  const { actual } = useEspacio()
  const espacio = actual!.id
  const esAdmin = puede.administrarEspacio(actual?.rol)
  const marcas = useMarcas(espacio)
  const progresos = useProgresos(espacio)
  const [verArchivadas, setVerArchivadas] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [creando, setCreando] = useState(false)

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return (marcas.data ?? []).filter(
      (m) => m.archivada === verArchivadas && (!q || m.nombre.toLowerCase().includes(q) || m.descripcion.toLowerCase().includes(q)),
    )
  }, [marcas.data, verArchivadas, busqueda])

  const archivadas = (marcas.data ?? []).filter((m) => m.archivada).length

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Marcas"
        descripcion="Cada marca, emprendimiento o cliente tiene su propia estrategia, objetivos y contenido."
        acciones={
          esAdmin && !creando ? (
            <Boton onClick={() => setCreando(true)}>Nueva marca</Boton>
          ) : undefined
        }
      />

      {creando && <NuevaMarca espacio={espacio} alCerrar={() => setCreando(false)} />}

      {marcas.isPending && <Cargando />}
      {marcas.error && <Aviso tipo="error">{mensajeError(marcas.error)}</Aviso>}

      {marcas.data && marcas.data.length === 0 && !creando && (
        <Tarjeta titulo="Aún no hay marcas">
          <p className="text-sm text-stone-600">
            {esAdmin
              ? 'Crea tu primera marca para empezar su estrategia. Después podrás planificar sus publicaciones.'
              : 'Cuando un administrador cree una marca, aparecerá aquí.'}
          </p>
          {esAdmin && (
            <Boton className="mt-4" onClick={() => setCreando(true)}>
              Crear la primera marca
            </Boton>
          )}
        </Tarjeta>
      )}

      {marcas.data && marcas.data.length > 0 && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <Campo
              className="min-w-56 flex-1"
              etiqueta="Buscar"
              type="search"
              placeholder="Nombre o descripción"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            <div role="group" aria-label="Mostrar" className="flex rounded-lg border border-stone-300 bg-white p-0.5 text-sm">
              <button
                type="button"
                aria-pressed={!verArchivadas}
                onClick={() => setVerArchivadas(false)}
                className={'rounded-md px-3 py-1.5 ' + (!verArchivadas ? 'bg-marca-700 text-white' : 'text-stone-700')}
              >
                Activas
              </button>
              <button
                type="button"
                aria-pressed={verArchivadas}
                onClick={() => setVerArchivadas(true)}
                className={'rounded-md px-3 py-1.5 ' + (verArchivadas ? 'bg-marca-700 text-white' : 'text-stone-700')}
              >
                Archivadas ({archivadas})
              </button>
            </div>
          </div>

          {lista.length === 0 ? (
            <p className="text-sm text-stone-500">
              {busqueda ? 'Ninguna marca coincide con la búsqueda.' : verArchivadas ? 'No hay marcas archivadas.' : 'No hay marcas activas.'}
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {lista.map((m) => {
                const est = progresos.data?.estrategias.find((e) => e.marca_id === m.id)
                const nObj = progresos.data?.objetivos.filter((o) => o.marca_id === m.id).length ?? 0
                const p = est ? progresoEstrategia(est, nObj) : null
                return (
                  <li key={m.id}>
                    <Link
                      to={`/marcas/${m.id}`}
                      className="block h-full rounded-xl border border-stone-200 bg-white p-4 transition hover:border-marca-600 hover:shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span aria-hidden className="size-4 shrink-0 rounded-full" style={{ backgroundColor: m.color }} />
                        <h2 className="truncate font-semibold">{m.nombre}</h2>
                      </div>
                      {m.descripcion && <p className="mt-2 line-clamp-2 text-sm text-stone-600">{m.descripcion}</p>}
                      <div className="mt-4">
                        {p ? <BarraProgreso etiqueta="Estrategia" porcentaje={p.porcentaje} /> : <span className="text-xs text-stone-400">…</span>}
                        <p className="mt-2 text-xs text-stone-500">
                          {nObj === 0 ? 'Sin objetivos' : nObj === 1 ? '1 objetivo' : `${nObj} objetivos`}
                        </p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}

function NuevaMarca({ espacio, alCerrar }: { espacio: string; alCerrar: () => void }) {
  const qc = useQueryClient()
  const avisar = useNotas()
  const navegar = useNavigate()
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [color, setColor] = useState('#0f766e')

  const crear = useMutation({
    mutationFn: async () =>
      exigir(
        await supabase
          .from('marcas')
          .insert({ espacio_id: espacio, nombre: nombre.trim(), descripcion: descripcion.trim(), color })
          .select()
          .single(),
      ),
    onSuccess: (m) => {
      avisar('Marca creada. Empieza por su estrategia.')
      qc.invalidateQueries({ queryKey: claves.marcas(espacio) })
      qc.invalidateQueries({ queryKey: claves.progresos(espacio) })
      navegar(`/marcas/${m.id}`)
    },
    onError: (e) => {
      const err = e as { code?: string }
      avisar(err.code === '23505' ? 'Ya existe una marca con ese nombre en este espacio.' : mensajeError(e), 'error')
    },
  })

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (nombre.trim()) crear.mutate()
  }

  return (
    <Tarjeta titulo="Nueva marca">
      <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-[1fr_auto]" noValidate>
        <Campo etiqueta="Nombre" required maxLength={80} autoFocus value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <div>
          <label htmlFor="color-marca" className="mb-1 block text-sm font-medium text-stone-800">
            Color
          </label>
          <input
            id="color-marca"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-20 cursor-pointer rounded-lg border border-stone-300 bg-white p-1"
          />
        </div>
        <Campo
          className="sm:col-span-2"
          etiqueta="Descripción breve"
          maxLength={2000}
          placeholder="Qué es y a qué se dedica"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          ayuda="Opcional. El color identifica la marca en el calendario."
        />
        <div className="flex gap-2 sm:col-span-2">
          <Boton type="submit" cargando={crear.isPending} disabled={!nombre.trim()}>
            Crear marca
          </Boton>
          <Boton variante="secundario" onClick={alCerrar} disabled={crear.isPending}>
            Cancelar
          </Boton>
        </div>
      </form>
    </Tarjeta>
  )
}
