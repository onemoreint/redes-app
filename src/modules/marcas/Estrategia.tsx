import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/datos/supabase'
import { exigir, mensajeError } from '../../lib/datos/errores'
import type { Estrategia as TEstrategia } from '../../lib/datos/tipos-bd'
import {
  COMPETENCIA,
  EJECUTAR,
  INVESTIGAR,
  MEDIR,
  progresoEstrategia,
  progresoSeccion,
  type CampoCheck,
  type CampoTexto,
  type Pregunta,
} from '../../lib/calculos/estrategia'
import { Areatexto, Aviso, BarraProgreso, Tarjeta } from '../../components/ui'
import { claves } from './datos'
import Objetivos from './Objetivos'

type EstadoGuardado = 'inactivo' | 'guardando' | 'guardado' | 'error'

function useGuardarCampo(marca: string, espacio: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (cambio: Partial<Record<CampoTexto, string> & Record<CampoCheck, boolean>>) => {
      const r = exigir(await supabase.from('estrategias').update(cambio).eq('marca_id', marca).select())
      if (r.length === 0) throw { code: '42501' }
      return r[0]
    },
    onSuccess: (fila) => {
      qc.setQueryData(claves.estrategia(marca), fila)
      qc.invalidateQueries({ queryKey: claves.progresos(espacio) })
    },
  })
}

/** Texto que se guarda solo: al salir del campo o tras 1,5 s sin escribir. */
function PreguntaAutoguardada({
  pregunta,
  valor,
  editable,
  guardar,
}: {
  pregunta: Pregunta
  valor: string
  editable: boolean
  guardar: (v: string) => Promise<unknown>
}) {
  const [texto, setTexto] = useState(valor)
  const [estado, setEstado] = useState<EstadoGuardado>('inactivo')
  const guardadoRef = useRef(valor)
  const temporizador = useRef<number | null>(null)

  useEffect(() => {
    // Si otra persona cambió el valor y aquí no hay cambios sin guardar, mostrar el nuevo
    if (texto === guardadoRef.current) {
      setTexto(valor)
      guardadoRef.current = valor
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor])

  async function persistir(v: string) {
    if (temporizador.current) window.clearTimeout(temporizador.current)
    if (v === guardadoRef.current) return
    setEstado('guardando')
    try {
      await guardar(v)
      guardadoRef.current = v
      setEstado('guardado')
    } catch {
      setEstado('error')
    }
  }

  useEffect(() => {
    const avisar = (e: BeforeUnloadEvent) => {
      if (texto !== guardadoRef.current) e.preventDefault()
    }
    window.addEventListener('beforeunload', avisar)
    return () => window.removeEventListener('beforeunload', avisar)
  }, [texto])

  const textoEstado = {
    inactivo: '',
    guardando: 'Guardando…',
    guardado: 'Guardado',
    error: 'No se pudo guardar. Revisa tu conexión; se reintentará al salir del campo.',
  }[estado]

  return (
    <div>
      <Areatexto
        etiqueta={pregunta.etiqueta}
        ayuda={pregunta.ayuda}
        maxLength={5000}
        readOnly={!editable}
        value={texto}
        onChange={(e) => {
          const v = e.target.value
          setTexto(v)
          setEstado('inactivo')
          if (temporizador.current) window.clearTimeout(temporizador.current)
          temporizador.current = window.setTimeout(() => persistir(v), 1500)
        }}
        onBlur={() => persistir(texto)}
      />
      <p aria-live="polite" className={'mt-0.5 h-4 text-xs ' + (estado === 'error' ? 'text-red-700' : 'text-stone-400')}>
        {textoEstado}
      </p>
    </div>
  )
}

function Seccion({
  titulo,
  descripcion,
  preguntas,
  estrategia,
  editable,
  guardar,
}: {
  titulo: string
  descripcion: string
  preguntas: Pregunta[]
  estrategia: TEstrategia
  editable: boolean
  guardar: (campo: CampoTexto, v: string) => Promise<unknown>
}) {
  const p = progresoSeccion(estrategia, preguntas)
  return (
    <Tarjeta titulo={titulo} descripcion={descripcion} acciones={<span className="text-xs text-stone-500">{p.completados} de {p.total}</span>}>
      <div className="grid gap-4 md:grid-cols-2">
        {preguntas.map((q) => (
          <PreguntaAutoguardada key={q.campo} pregunta={q} valor={estrategia[q.campo]} editable={editable} guardar={(v) => guardar(q.campo, v)} />
        ))}
      </div>
    </Tarjeta>
  )
}

export default function Estrategia({
  marca,
  espacio,
  estrategia,
  editable,
  cantidadObjetivos,
  zona,
}: {
  marca: string
  espacio: string
  estrategia: TEstrategia
  editable: boolean
  cantidadObjetivos: number
  zona: string
}) {
  const guardarCampo = useGuardarCampo(marca, espacio)
  const progreso = progresoEstrategia(estrategia, cantidadObjetivos)
  const guardarTexto = (campo: CampoTexto, v: string) => guardarCampo.mutateAsync({ [campo]: v })

  return (
    <div className="space-y-6">
      <Tarjeta>
        <BarraProgreso etiqueta={`Estrategia completada (${progreso.completados} de ${progreso.total})`} porcentaje={progreso.porcentaje} />
        <p className="mt-3 text-xs text-stone-500">
          {editable
            ? 'Los cambios se guardan solos al salir de cada campo. Sigue el orden: investigar, planear, ejecutar y medir.'
            : 'Solo lectura: tu rol no permite editar la estrategia.'}
        </p>
      </Tarjeta>

      <Seccion
        titulo="1. Investigar"
        descripcion="Descubrimiento y análisis de la marca."
        preguntas={INVESTIGAR}
        estrategia={estrategia}
        editable={editable}
        guardar={guardarTexto}
      />
      <Seccion
        titulo="Análisis competitivo"
        descripcion="Con quién compites y en qué te diferencias."
        preguntas={COMPETENCIA}
        estrategia={estrategia}
        editable={editable}
        guardar={guardarTexto}
      />

      <Objetivos marca={marca} espacio={espacio} editable={editable} zona={zona} />

      <Tarjeta titulo="3. Ejecutar" descripcion="Lista de comprobación para implementar y lanzar.">
        {guardarCampo.isError && <div className="mb-3"><Aviso tipo="error">{mensajeError(guardarCampo.error)}</Aviso></div>}
        <ul className="space-y-2">
          {EJECUTAR.map((c) => (
            <li key={c.campo}>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg p-2 hover:bg-stone-50">
                <input
                  type="checkbox"
                  className="mt-0.5 size-4 accent-marca-700"
                  checked={estrategia[c.campo]}
                  disabled={!editable || guardarCampo.isPending}
                  onChange={(e) => guardarCampo.mutate({ [c.campo]: e.target.checked })}
                />
                <span className="text-sm">{c.etiqueta}</span>
              </label>
            </li>
          ))}
        </ul>
      </Tarjeta>

      <Seccion
        titulo="4. Medir"
        descripcion="Métricas, seguimiento y evaluación. Los números llegarán con el módulo de métricas."
        preguntas={MEDIR}
        estrategia={estrategia}
        editable={editable}
        guardar={guardarTexto}
      />
    </div>
  )
}
