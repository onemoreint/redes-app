import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/datos/supabase'
import { exigir, mensajeError } from '../../lib/datos/errores'
import type { MetricaFila, PublicacionCanal } from '../../lib/datos/tipos-bd'
import { aNumero } from '../../lib/numeros'
import { compromiso, tasaCompromiso } from '../../lib/calculos/metricas'
import { Aviso, Boton, Campo, Cargando, DialogoConfirmar, Tarjeta, useNotas } from '../../components/ui'
import { useEspacio } from '../../app/espacio'
import { hoyEn } from '../marcas/datos'

export const CAMPOS_METRICA = [
  { campo: 'alcance', etiqueta: 'Alcance' },
  { campo: 'impresiones', etiqueta: 'Impresiones' },
  { campo: 'me_gusta', etiqueta: 'Me gusta' },
  { campo: 'comentarios', etiqueta: 'Comentarios' },
  { campo: 'compartidos', etiqueta: 'Compartidos' },
  { campo: 'guardados', etiqueta: 'Guardados' },
  { campo: 'clics', etiqueta: 'Clics' },
  { campo: 'menciones', etiqueta: 'Menciones' },
] as const
type CampoM = (typeof CAMPOS_METRICA)[number]['campo']

export const aMetrica = (m: Pick<MetricaFila, CampoM>) => ({
  alcance: m.alcance,
  impresiones: m.impresiones,
  meGusta: m.me_gusta,
  comentarios: m.comentarios,
  compartidos: m.compartidos,
  guardados: m.guardados,
  clics: m.clics,
  menciones: m.menciones,
})

const num = new Intl.NumberFormat('es')
const clave = (pub: string) => ['metricas', 'publicacion', pub] as const

export default function Resultados({ publicacion, canales, editable }: { publicacion: string; canales: PublicacionCanal[]; editable: boolean }) {
  const { actual } = useEspacio()
  const mediciones = useQuery({
    queryKey: clave(publicacion),
    queryFn: async () => exigir(await supabase.from('metricas').select('*').eq('publicacion_id', publicacion).order('medido_el')),
  })

  return (
    <Tarjeta
      titulo="Resultados"
      descripcion="Copia aquí las cifras que muestra cada red. Puedes medir varias veces (por ejemplo a las 24 horas y a los 7 días); el informe usa la más reciente. Todos estos datos son manuales."
    >
      {canales.length === 0 && <p className="text-sm text-stone-500">Marca al menos una red y guarda para poder registrar resultados.</p>}
      {mediciones.isPending && canales.length > 0 && <Cargando />}
      {mediciones.error && <Aviso tipo="error">{mensajeError(mediciones.error)}</Aviso>}
      {mediciones.data && (
        <div className="space-y-5">
          {canales.map((c) => (
            <ResultadosRed
              key={c.id}
              publicacion={publicacion}
              canal={c}
              mediciones={mediciones.data.filter((m) => m.publicacion_canal_id === c.id)}
              editable={editable}
              hoy={hoyEn(actual!.zona_horaria)}
            />
          ))}
        </div>
      )}
    </Tarjeta>
  )
}

function ResultadosRed({
  publicacion,
  canal,
  mediciones,
  editable,
  hoy,
}: {
  publicacion: string
  canal: PublicacionCanal
  mediciones: MetricaFila[]
  editable: boolean
  hoy: string
}) {
  const qc = useQueryClient()
  const avisar = useNotas()
  const [editando, setEditando] = useState<MetricaFila | 'nueva' | null>(null)
  const [aBorrar, setABorrar] = useState<MetricaFila | null>(null)

  const borrar = useMutation({
    mutationFn: async (id: string) => {
      const r = exigir(await supabase.from('metricas').delete().eq('id', id).select('id'))
      if (r.length === 0) throw { code: '42501' }
    },
    onSuccess: () => {
      setABorrar(null)
      avisar('Medición eliminada.')
      qc.invalidateQueries({ queryKey: ['metricas'] })
    },
    onError: (e) => avisar(mensajeError(e), 'error'),
  })

  return (
    <section className="rounded-lg border border-stone-200 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">
          {canal.canal}
          {canal.kpi_esperado && <span className="ml-2 font-normal text-stone-500">Meta: {canal.kpi_esperado}</span>}
        </h3>
        {editable && editando === null && (
          <Boton variante="secundario" onClick={() => setEditando('nueva')}>
            Registrar resultados
          </Boton>
        )}
      </div>

      {editando !== null && (
        <FormularioMedicion
          publicacion={publicacion}
          canal={canal}
          medicion={editando === 'nueva' ? null : editando}
          hoy={hoy}
          alCerrar={() => setEditando(null)}
        />
      )}

      {mediciones.length === 0 && editando === null && <p className="text-sm text-stone-500">Sin resultados registrados.</p>}
      {mediciones.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-right text-xs">
            <thead className="text-stone-500">
              <tr>
                <th className="py-1 text-left font-medium">Medido el</th>
                {CAMPOS_METRICA.map((c) => (
                  <th key={c.campo} className="py-1 font-medium">
                    {c.etiqueta}
                  </th>
                ))}
                <th className="py-1 font-medium">Compromiso</th>
                <th className="py-1 font-medium">Tasa</th>
                {editable && <th className="py-1" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 tabular-nums">
              {mediciones.map((m) => {
                const met = aMetrica(m)
                const tasa = tasaCompromiso(met)
                return (
                  <tr key={m.id}>
                    <td className="py-1.5 text-left">
                      {new Date(`${m.medido_el}T12:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                      <span className="ml-1 rounded bg-stone-100 px-1 text-[10px] text-stone-500">manual</span>
                    </td>
                    {CAMPOS_METRICA.map((c) => (
                      <td key={c.campo} className="py-1.5">
                        {m[c.campo] == null ? '—' : num.format(m[c.campo]!)}
                      </td>
                    ))}
                    <td className="py-1.5 font-semibold">{num.format(compromiso(met))}</td>
                    <td className="py-1.5">{tasa == null ? '—' : `${(tasa * 100).toFixed(1).replace('.', ',')} %`}</td>
                    {editable && (
                      <td className="whitespace-nowrap py-1.5">
                        <button type="button" className="text-marca-700 hover:underline" onClick={() => setEditando(m)}>
                          Editar
                        </button>
                        <button type="button" className="ml-2 text-red-700 hover:underline" onClick={() => setABorrar(m)}>
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <DialogoConfirmar
        abierto={aBorrar !== null}
        titulo="¿Eliminar esta medición?"
        textoConfirmar="Eliminar"
        peligro
        cargando={borrar.isPending}
        onCerrar={() => setABorrar(null)}
        onConfirmar={() => aBorrar && borrar.mutate(aBorrar.id)}
      >
        <p>Se quitarán las cifras de {canal.canal} medidas el {aBorrar?.medido_el}.</p>
      </DialogoConfirmar>
    </section>
  )
}

function FormularioMedicion({
  publicacion,
  canal,
  medicion,
  hoy,
  alCerrar,
}: {
  publicacion: string
  canal: PublicacionCanal
  medicion: MetricaFila | null
  hoy: string
  alCerrar: () => void
}) {
  const qc = useQueryClient()
  const avisar = useNotas()
  const { actual } = useEspacio()
  const [fecha, setFecha] = useState(medicion?.medido_el ?? hoy)
  const [valores, setValores] = useState<Record<CampoM, string>>(
    () => Object.fromEntries(CAMPOS_METRICA.map((c) => [c.campo, medicion?.[c.campo]?.toString() ?? ''])) as Record<CampoM, string>,
  )
  const [notas, setNotas] = useState(medicion?.notas ?? '')

  const numeros = Object.fromEntries(CAMPOS_METRICA.map((c) => [c.campo, aNumero(valores[c.campo])])) as Record<CampoM, number | null>
  const errores = Object.fromEntries(
    CAMPOS_METRICA.map((c) => {
      const n = numeros[c.campo]
      return [c.campo, n != null && (Number.isNaN(n) || n < 0 || !Number.isInteger(n)) ? 'Número entero ≥ 0' : null]
    }),
  ) as Record<CampoM, string | null>
  const hayErrores = Object.values(errores).some(Boolean)
  const algunValor = CAMPOS_METRICA.some((c) => numeros[c.campo] != null)
  const valido = fecha && !hayErrores && algunValor && fecha <= hoy

  const guardar = useMutation({
    mutationFn: async () => {
      const datos = { medido_el: fecha, notas: notas.trim(), ...numeros }
      if (medicion) {
        const r = exigir(await supabase.from('metricas').update(datos).eq('id', medicion.id).select('id'))
        if (r.length === 0) throw { code: '42501' }
      } else {
        exigir(
          await supabase
            .from('metricas')
            .insert({ ...datos, publicacion_canal_id: canal.id, publicacion_id: publicacion, espacio_id: actual!.id })
            .select('id'),
        )
      }
    },
    onSuccess: () => {
      avisar('Resultados guardados.')
      qc.invalidateQueries({ queryKey: ['metricas'] })
      alCerrar()
    },
    onError: (e) => {
      const err = e as { code?: string }
      avisar(err.code === '23505' ? `Ya hay una medición de ${canal.canal} con esa fecha. Edítala en lugar de crear otra.` : mensajeError(e), 'error')
    },
  })

  return (
    <div className="mb-3 rounded-lg bg-marca-50/60 p-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Campo
          etiqueta="Medido el"
          type="date"
          max={hoy}
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          error={fecha > hoy ? 'No puede ser futura' : null}
        />
        {CAMPOS_METRICA.map((c) => (
          <Campo
            key={c.campo}
            etiqueta={c.etiqueta}
            inputMode="numeric"
            value={valores[c.campo]}
            onChange={(e) => setValores({ ...valores, [c.campo]: e.target.value })}
            error={errores[c.campo]}
          />
        ))}
        <Campo className="col-span-2 sm:col-span-3" etiqueta="Notas" maxLength={1000} value={notas} onChange={(e) => setNotas(e.target.value)} />
      </div>
      {!algunValor && <p className="mt-2 text-xs text-stone-500">Escribe al menos una cifra. Deja vacío lo que la red no muestra.</p>}
      <div className="mt-3 flex gap-2">
        <Boton cargando={guardar.isPending} disabled={!valido} onClick={() => guardar.mutate()}>
          Guardar resultados
        </Boton>
        <Boton variante="secundario" onClick={alCerrar} disabled={guardar.isPending}>
          Cancelar
        </Boton>
      </div>
    </div>
  )
}
