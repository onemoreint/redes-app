import { useState } from 'react'
import { Boton, Tarjeta, useNotas } from '../../components/ui'
import { supabase } from '../../lib/datos/supabase'
import { mensajeError } from '../../lib/datos/errores'
import { descargar } from '../../lib/csv'
import type { MiEspacio } from '../../app/espacio'

/** Tablas que se copian (todas tienen espacio_id). Las invitaciones no: llevan enlaces de acceso y caducan. */
const TABLAS = [
  'miembros',
  'marcas',
  'estrategias',
  'objetivos',
  'campanas',
  'publicaciones',
  'publicacion_canales',
  'comentarios',
  'metricas',
  'cuentas_red',
  'registros_auditoria',
  'importaciones',
] as const

const PAGINA = 1000
/** Columna única para paginar de forma estable. */
const ORDEN: Partial<Record<(typeof TABLAS)[number], string>> = { miembros: 'usuario_id', estrategias: 'marca_id' }

/** Descarga un .json con todo el contenido del espacio. Solo lectura: no cambia nada. */
export function CopiaSeguridad({ espacio }: { espacio: MiEspacio }) {
  const [trabajando, setTrabajando] = useState<string | null>(null)
  const avisar = useNotas()

  async function copiar() {
    try {
      const datos: Record<string, unknown[]> = {}
      for (const t of TABLAS) {
        setTrabajando(t.replace('_', ' '))
        const filas: unknown[] = []
        for (let desde = 0; ; desde += PAGINA) {
          const { data, error } = await supabase.from(t).select('*').eq('espacio_id', espacio.id).order(ORDEN[t] ?? 'id').range(desde, desde + PAGINA - 1)
          if (error) throw error
          filas.push(...(data ?? []))
          if ((data ?? []).length < PAGINA) break
        }
        datos[t] = filas
      }
      const usuarios = [...new Set((datos.miembros as { usuario_id: string }[]).map((m) => m.usuario_id))]
      const { data: perfiles, error } = usuarios.length
        ? await supabase.from('perfiles').select('id, nombre, email').in('id', usuarios)
        : { data: [], error: null }
      if (error) throw error
      const { rol: _rol, ...espacioSinRol } = espacio
      const copia = {
        formato: 'redes-app/copia-espacio',
        version: 1,
        generada_en: new Date().toISOString(),
        espacio: espacioSinRol,
        perfiles,
        ...datos,
      }
      const fecha = new Date().toISOString().slice(0, 10)
      descargar(
        `copia-${espacio.nombre.replace(/[^\p{L}\p{N}]+/gu, '-')}-${fecha}.json`,
        JSON.stringify(copia, null, 2),
        'application/json;charset=utf-8',
      )
      const total = Object.values(datos).reduce((s, f) => s + f.length, 0)
      avisar(`Copia descargada: ${total.toLocaleString('es')} registros.`)
    } catch (e) {
      avisar(`No se pudo generar la copia: ${mensajeError(e)}`, 'error')
    } finally {
      setTrabajando(null)
    }
  }

  return (
    <Tarjeta
      titulo="Copia de seguridad"
      descripcion="Descarga un archivo .json con todo el contenido del espacio (marcas, estrategia, publicaciones, métricas, auditoría, campañas, comentarios y miembros). Guárdalo en un lugar seguro. El plan gratuito de Supabase no hace copias automáticas."
    >
      <Boton variante="secundario" onClick={() => void copiar()} cargando={!!trabajando}>
        {trabajando ? `Copiando ${trabajando}…` : 'Descargar copia (.json)'}
      </Boton>
      <p className="mt-2 text-xs text-stone-500">Para restaurarla hace falta ayuda técnica: el procedimiento está en docs/mantenimiento.md del repositorio.</p>
    </Tarjeta>
  )
}
