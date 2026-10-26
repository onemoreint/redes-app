import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/datos/supabase'
import { exigir, mensajeError } from '../../lib/datos/errores'
import type { EstadoObjetivo, Objetivo } from '../../lib/datos/tipos-bd'
import { CANALES } from '../../lib/canales'
import { aNumero } from '../../lib/numeros'
import { cambioObjetivo, objetivoVencido } from '../../lib/calculos/estrategia'
import { Areatexto, Aviso, Boton, Campo, Cargando, DialogoConfirmar, Selector, Tarjeta, useNotas } from '../../components/ui'
import { claves, hoyEn, useObjetivos } from './datos'

const NOMBRE_ESTADO: Record<EstadoObjetivo, string> = {
  activo: 'Activo',
  logrado: 'Logrado',
  revisado: 'Revisado',
  abandonado: 'Abandonado',
}
const COLOR_ESTADO: Record<EstadoObjetivo, string> = {
  activo: 'bg-sky-50 text-sky-800',
  logrado: 'bg-emerald-50 text-emerald-800',
  revisado: 'bg-amber-50 text-amber-800',
  abandonado: 'bg-stone-100 text-stone-600',
}

const num = new Intl.NumberFormat('es')
const fechaCorta = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })

type Borrador = {
  descripcion: string
  canal: string
  metrica: string
  valor_inicial: string
  valor_meta: string
  fecha_limite: string
  estado: EstadoObjetivo
  nota_revision: string
}

const vacio: Borrador = {
  descripcion: '',
  canal: '',
  metrica: '',
  valor_inicial: '',
  valor_meta: '',
  fecha_limite: '',
  estado: 'activo',
  nota_revision: '',
}

const aBorrador = (o: Objetivo): Borrador => ({
  descripcion: o.descripcion,
  canal: o.canal ?? '',
  metrica: o.metrica,
  valor_inicial: o.valor_inicial?.toString() ?? '',
  valor_meta: o.valor_meta?.toString() ?? '',
  fecha_limite: o.fecha_limite ?? '',
  estado: o.estado,
  nota_revision: o.nota_revision,
})

export default function Objetivos({ marca, espacio, editable, zona }: { marca: string; espacio: string; editable: boolean; zona: string }) {
  const objetivos = useObjetivos(marca)
  const [editando, setEditando] = useState<Objetivo | 'nuevo' | null>(null)
  const [aBorrar, setABorrar] = useState<Objetivo | null>(null)
  const qc = useQueryClient()
  const avisar = useNotas()
  const hoy = hoyEn(zona)

  const borrar = useMutation({
    mutationFn: async (id: string) => {
      const r = exigir(await supabase.from('objetivos').delete().eq('id', id).select())
      if (r.length === 0) throw { code: '42501' }
    },
    onSuccess: () => {
      setABorrar(null)
      avisar('Objetivo eliminado.')
      qc.invalidateQueries({ queryKey: claves.objetivos(marca) })
      qc.invalidateQueries({ queryKey: claves.progresos(espacio) })
    },
    onError: (e) => avisar(mensajeError(e), 'error'),
  })

  return (
    <Tarjeta
      titulo="2. Planear: objetivos"
      descripcion="Qué quieres lograr y cómo lo medirás. Ej.: «Pasar de 1.000 a 1.500 seguidores en Instagram antes del 31 de diciembre»."
      acciones={editable && editando === null ? <Boton onClick={() => setEditando('nuevo')}>Nuevo objetivo</Boton> : undefined}
    >
      {editando !== null && (
        <FormularioObjetivo
          marca={marca}
          espacio={espacio}
          objetivo={editando === 'nuevo' ? null : editando}
          alCerrar={() => setEditando(null)}
        />
      )}

      {objetivos.isPending && <Cargando />}
      {objetivos.error && <Aviso tipo="error">{mensajeError(objetivos.error)}</Aviso>}
      {objetivos.data && objetivos.data.length === 0 && editando === null && (
        <p className="text-sm text-stone-500">Aún no hay objetivos.{editable && ' Crea el primero con «Nuevo objetivo».'}</p>
      )}
      {objetivos.data && objetivos.data.length > 0 && (
        <ul className="mt-2 divide-y divide-stone-100">
          {objetivos.data.map((o) => {
            const vencido = objetivoVencido(o, hoy)
            const cambio = cambioObjetivo(o)
            return (
              <li key={o.id} className="flex flex-wrap items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{o.descripcion}</p>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-600">
                    {o.canal && <span>{o.canal}</span>}
                    {o.metrica && <span>{o.metrica}</span>}
                    {(o.valor_inicial != null || o.valor_meta != null) && (
                      <span>
                        {o.valor_inicial != null ? num.format(o.valor_inicial) : '—'} → {o.valor_meta != null ? num.format(o.valor_meta) : '—'}
                        {cambio && cambio.porcentaje != null && ` (${cambio.absoluto >= 0 ? '+' : ''}${Math.round(cambio.porcentaje * 100)} %)`}
                      </span>
                    )}
                    {o.fecha_limite && (
                      <span className={vencido ? 'font-medium text-red-700' : ''}>
                        {vencido ? 'Venció el ' : 'Hasta el '}
                        {fechaCorta(o.fecha_limite)}
                      </span>
                    )}
                  </p>
                  {o.nota_revision && <p className="mt-1 text-xs italic text-stone-500">Revisión: {o.nota_revision}</p>}
                </div>
                <span className={'rounded-full px-2.5 py-0.5 text-xs font-medium ' + COLOR_ESTADO[o.estado]}>{NOMBRE_ESTADO[o.estado]}</span>
                {editable && (
                  <div className="flex gap-1">
                    <Boton variante="fantasma" onClick={() => setEditando(o)}>
                      Editar
                    </Boton>
                    <Boton variante="fantasma" className="text-red-700 hover:bg-red-50" onClick={() => setABorrar(o)}>
                      Eliminar
                    </Boton>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <DialogoConfirmar
        abierto={aBorrar !== null}
        titulo="¿Eliminar este objetivo?"
        textoConfirmar="Eliminar"
        peligro
        cargando={borrar.isPending}
        onCerrar={() => setABorrar(null)}
        onConfirmar={() => aBorrar && borrar.mutate(aBorrar.id)}
      >
        <p>«{aBorrar?.descripcion}». Si solo cambió, mejor edítalo y márcalo como «Revisado» para conservar el historial.</p>
      </DialogoConfirmar>
    </Tarjeta>
  )
}

function FormularioObjetivo({
  marca,
  espacio,
  objetivo,
  alCerrar,
}: {
  marca: string
  espacio: string
  objetivo: Objetivo | null
  alCerrar: () => void
}) {
  const [b, setB] = useState<Borrador>(objetivo ? aBorrador(objetivo) : vacio)
  const qc = useQueryClient()
  const avisar = useNotas()
  const set = <K extends keyof Borrador>(k: K, v: Borrador[K]) => setB((x) => ({ ...x, [k]: v }))

  const inicial = aNumero(b.valor_inicial)
  const meta = aNumero(b.valor_meta)
  const errInicial = Number.isNaN(inicial) || (inicial ?? 0) < 0 ? 'Escribe un número mayor o igual a 0.' : null
  const errMeta = Number.isNaN(meta) || (meta ?? 0) < 0 ? 'Escribe un número mayor o igual a 0.' : null
  const valido = b.descripcion.trim() && !errInicial && !errMeta

  const guardar = useMutation({
    mutationFn: async () => {
      const datos = {
        descripcion: b.descripcion.trim(),
        canal: b.canal || null,
        metrica: b.metrica.trim(),
        valor_inicial: inicial,
        valor_meta: meta,
        fecha_limite: b.fecha_limite || null,
        estado: b.estado,
        nota_revision: b.nota_revision.trim(),
      }
      if (objetivo) {
        const r = exigir(await supabase.from('objetivos').update(datos).eq('id', objetivo.id).select())
        if (r.length === 0) throw { code: '42501' }
      } else {
        exigir(await supabase.from('objetivos').insert({ ...datos, marca_id: marca, espacio_id: espacio }).select())
      }
    },
    onSuccess: () => {
      avisar(objetivo ? 'Objetivo actualizado.' : 'Objetivo creado.')
      qc.invalidateQueries({ queryKey: claves.objetivos(marca) })
      qc.invalidateQueries({ queryKey: claves.progresos(espacio) })
      alCerrar()
    },
    onError: (e) => avisar(mensajeError(e), 'error'),
  })

  function enviar(e: FormEvent) {
    e.preventDefault()
    if (valido) guardar.mutate()
  }

  return (
    <form onSubmit={enviar} className="mb-4 grid gap-4 rounded-lg border border-marca-100 bg-marca-50/50 p-4 sm:grid-cols-2" noValidate>
      <Areatexto
        className="sm:col-span-2"
        etiqueta="Qué y cómo"
        rows={2}
        required
        maxLength={1000}
        autoFocus
        placeholder="Ej.: Aumentar seguidores publicando 3 reels por semana"
        value={b.descripcion}
        onChange={(e) => set('descripcion', e.target.value)}
      />
      <Selector etiqueta="Red social" value={b.canal} onChange={(e) => set('canal', e.target.value)} ayuda="Opcional, si el objetivo es de una red.">
        <option value="">Todas / ninguna en particular</option>
        {CANALES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        {b.canal && !(CANALES as readonly string[]).includes(b.canal) && <option value={b.canal}>{b.canal}</option>}
      </Selector>
      <Campo
        etiqueta="Métrica"
        maxLength={120}
        placeholder="Seguidores, alcance, clics…"
        value={b.metrica}
        onChange={(e) => set('metrica', e.target.value)}
      />
      <Campo etiqueta="Valor inicial" inputMode="decimal" value={b.valor_inicial} onChange={(e) => set('valor_inicial', e.target.value)} error={errInicial} />
      <Campo etiqueta="Meta" inputMode="decimal" value={b.valor_meta} onChange={(e) => set('valor_meta', e.target.value)} error={errMeta} />
      <Campo etiqueta="Fecha límite" type="date" value={b.fecha_limite} onChange={(e) => set('fecha_limite', e.target.value)} />
      <Selector etiqueta="Estado" value={b.estado} onChange={(e) => set('estado', e.target.value as EstadoObjetivo)}>
        {(Object.keys(NOMBRE_ESTADO) as EstadoObjetivo[]).map((s) => (
          <option key={s} value={s}>
            {NOMBRE_ESTADO[s]}
          </option>
        ))}
      </Selector>
      {(objetivo || b.estado !== 'activo') && (
        <Areatexto
          className="sm:col-span-2"
          etiqueta="Nota de evaluación"
          rows={2}
          maxLength={2000}
          placeholder="Qué pasó, qué se ajustó, cuál es el nuevo objetivo"
          value={b.nota_revision}
          onChange={(e) => set('nota_revision', e.target.value)}
        />
      )}
      <div className="flex gap-2 sm:col-span-2">
        <Boton type="submit" cargando={guardar.isPending} disabled={!valido}>
          {objetivo ? 'Guardar cambios' : 'Crear objetivo'}
        </Boton>
        <Boton variante="secundario" onClick={alCerrar} disabled={guardar.isPending}>
          Cancelar
        </Boton>
      </div>
    </form>
  )
}
