import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/datos/supabase'
import { exigir, mensajeError } from '../../lib/datos/errores'
import { puede } from '../../lib/roles'
import { aInstante, sumarDias } from '../../lib/calculos/calendario'
import { progresoEstrategia } from '../../lib/calculos/estrategia'
import { Boton, Tarjeta, useNotas } from '../../components/ui'
import type { MiEspacio } from '../../app/espacio'
import { hoyEn, useMarcas, useProgresos } from '../marcas/datos'

export const NOMBRE_MARCA_EJEMPLO = 'Ejemplo (puedes borrarla)'

const claveOculto = (espacio: string) => `redes-app:primeros-pasos-oculto:${espacio}`
function leerOculto(espacio: string) {
  try {
    return localStorage.getItem(claveOculto(espacio)) === '1'
  } catch {
    return false
  }
}

/** Conteos reales del espacio para saber qué pasos ya se hicieron. */
function useConteos(espacio: string) {
  return useQuery({
    queryKey: ['primeros-pasos', espacio],
    queryFn: async () => {
      const contar = async (tabla: 'cuentas_red' | 'publicaciones' | 'metricas' | 'miembros') => {
        const { count, error } = await supabase.from(tabla).select('*', { count: 'exact', head: true }).eq('espacio_id', espacio)
        if (error) throw error
        return count ?? 0
      }
      const [perfiles, publicaciones, metricas, miembros] = await Promise.all([contar('cuentas_red'), contar('publicaciones'), contar('metricas'), contar('miembros')])
      return { perfiles, publicaciones, metricas, miembros }
    },
  })
}

export function PrimerosPasos({ espacio }: { espacio: MiEspacio }) {
  const [oculto, setOculto] = useState(() => leerOculto(espacio.id))
  const marcas = useMarcas(espacio.id)
  const progresos = useProgresos(espacio.id)
  const conteos = useConteos(espacio.id)
  const [creando, setCreando] = useState(false)
  const qc = useQueryClient()
  const avisar = useNotas()

  if (oculto || !marcas.data || !conteos.data || !progresos.data) return null
  const c = conteos.data
  const conEstrategia = progresos.data.estrategias.some(
    (e) => progresoEstrategia(e, progresos.data.objetivos.filter((o) => o.marca_id === e.marca_id).length).completados > 0,
  )
  const esAdmin = puede.administrarEspacio(espacio.rol)
  const pasos = [
    { hecho: marcas.data.length > 0, texto: 'Crea una marca', enlace: '/marcas', nota: esAdmin ? undefined : 'la crea un administrador' },
    { hecho: conEstrategia, texto: 'Rellena la estrategia de la marca', enlace: marcas.data[0] ? `/marcas/${marcas.data[0].id}` : '/marcas' },
    { hecho: c.perfiles > 0, texto: 'Añade sus perfiles en redes', enlace: '/perfiles' },
    { hecho: c.publicaciones > 0, texto: 'Planifica o importa publicaciones', enlace: '/calendario', extra: { a: '/importar', texto: 'importar Excel' } },
    { hecho: c.metricas > 0, texto: 'Registra los resultados de una publicación', enlace: '/informes' },
    { hecho: c.miembros > 1, texto: 'Invita a tu equipo (opcional)', enlace: '/miembros' },
  ]
  const hechos = pasos.filter((p) => p.hecho).length
  if (hechos === pasos.length) return null

  function ocultar() {
    try {
      localStorage.setItem(claveOculto(espacio.id), '1')
    } catch {
      /* sin almacenamiento: se oculta solo en esta visita */
    }
    setOculto(true)
  }

  async function crearEjemplo() {
    setCreando(true)
    try {
      const marca = exigir(
        await supabase
          .from('marcas')
          .insert({
            espacio_id: espacio.id,
            nombre: NOMBRE_MARCA_EJEMPLO,
            descripcion: 'Marca de ejemplo para conocer la app. Sus publicaciones son de muestra, no datos reales. Bórrala desde Marcas cuando quieras: se borra todo lo suyo.',
            color: '#78716c',
          })
          .select('id')
          .single(),
      )
      const hoy = hoyEn(espacio.zona_horaria)
      const muestra = [
        { titulo: '[Ejemplo] Consejo de la semana', dias: 2, estado: 'borrador' as const, canales: ['Instagram', 'Facebook'], tipos: ['Imagen'] },
        { titulo: '[Ejemplo] Presentación del equipo', dias: 5, estado: 'en_revision' as const, canales: ['LinkedIn'], tipos: ['Texto'] },
        { titulo: '[Ejemplo] Idea sin fecha: preguntas frecuentes', dias: null, estado: 'idea' as const, canales: [], tipos: ['Carrusel'] },
      ]
      const pubs = exigir(
        await supabase
          .from('publicaciones')
          .insert(
            muestra.map((m) => ({
              espacio_id: espacio.id,
              marca_id: marca.id,
              titulo: m.titulo,
              estado: m.estado,
              tipos: m.tipos,
              fecha_prevista: m.dias == null ? null : aInstante(sumarDias(hoy, m.dias), '10:00', espacio.zona_horaria),
              texto: 'Texto de muestra. Edítalo o borra esta publicación.',
              notas: 'Publicación de ejemplo creada desde Primeros pasos.',
            })),
          )
          .select('id'),
      )
      const canales = pubs.flatMap((p, i) => muestra[i].canales.map((canal) => ({ publicacion_id: p.id, espacio_id: espacio.id, canal })))
      if (canales.length) exigir(await supabase.from('publicacion_canales').insert(canales).select('id'))
      qc.invalidateQueries()
      avisar('Se creó la marca de ejemplo con 3 publicaciones de muestra.')
    } catch (e) {
      avisar(mensajeError(e), 'error')
    } finally {
      setCreando(false)
    }
  }

  return (
    <Tarjeta
      titulo={`Primeros pasos · ${hechos} de ${pasos.length}`}
      descripcion="Se marcan solos a medida que usas la app."
      acciones={
        <Boton variante="fantasma" onClick={ocultar}>
          Ocultar
        </Boton>
      }
    >
      <ol className="space-y-2">
        {pasos.map((p) => (
          <li key={p.texto} className="flex items-start gap-2 text-sm">
            <span
              aria-hidden
              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-xs ${p.hecho ? 'bg-emerald-600 text-white' : 'border border-stone-300 text-transparent'}`}
            >
              ✓
            </span>
            <span className={p.hecho ? 'text-stone-500 line-through' : ''}>
              <span className="sr-only">{p.hecho ? 'Hecho: ' : 'Pendiente: '}</span>
              {p.hecho ? p.texto : <Link className="text-marca-700 hover:underline" to={p.enlace}>{p.texto}</Link>}
              {!p.hecho && p.extra && (
                <>
                  {' '}o <Link className="text-marca-700 hover:underline" to={p.extra.a}>{p.extra.texto}</Link>
                </>
              )}
              {!p.hecho && p.nota && <span className="text-stone-500"> ({p.nota})</span>}
            </span>
          </li>
        ))}
      </ol>
      {esAdmin && marcas.data.length === 0 && (
        <div className="mt-4 rounded-lg bg-stone-50 p-3 text-sm text-stone-700">
          ¿Prefieres ver cómo se ve primero?{' '}
          <Boton variante="secundario" className="ml-1" cargando={creando} onClick={() => void crearEjemplo()}>
            Crear una marca de ejemplo
          </Boton>
          <p className="mt-2 text-xs text-stone-500">Se llama «{NOMBRE_MARCA_EJEMPLO}» y trae 3 publicaciones marcadas [Ejemplo]. Bórrala desde Marcas cuando termines.</p>
        </div>
      )}
      <p className="mt-4 text-xs text-stone-500">
        ¿Dudas? Mira la <Link className="underline" to="/ayuda">Ayuda</Link>.
      </p>
    </Tarjeta>
  )
}
