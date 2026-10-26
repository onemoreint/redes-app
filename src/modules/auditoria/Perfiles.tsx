import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/datos/supabase'
import { exigir, mensajeError } from '../../lib/datos/errores'
import type { CuentaRed, RegistroAuditoria } from '../../lib/datos/tipos-bd'
import { puede } from '../../lib/roles'
import { CANALES } from '../../lib/canales'
import { aNumero } from '../../lib/numeros'
import { compararAuditoria, type Comparacion } from '../../lib/calculos/auditoria'
import { exportarTabla, type Formato } from '../../lib/exportar'
import { Aviso, Boton, Campo, Cargando, DialogoConfirmar, Encabezado, Selector, Tarjeta, useNotas } from '../../components/ui'
import { useEspacio } from '../../app/espacio'
import { hoyEn, useMarcas } from '../marcas/datos'

const num = new Intl.NumberFormat('es', { maximumFractionDigits: 2 })
const fechaCorta = (d: string | null) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export const claveCuentas = (espacio: string) => ['cuentas', espacio] as const

export function useCuentas(espacio: string) {
  return useQuery({
    queryKey: claveCuentas(espacio),
    queryFn: async () => exigir(await supabase.from('cuentas_red').select('*').eq('espacio_id', espacio).order('canal')),
  })
}

function useRegistros(espacio: string) {
  return useQuery({
    queryKey: ['auditoria', espacio],
    queryFn: async () => exigir(await supabase.from('registros_auditoria').select('*').eq('espacio_id', espacio).order('fecha')),
  })
}

function Variacion({ c, porcentaje = true }: { c: Comparacion; porcentaje?: boolean }) {
  if (c.cambio == null) return null
  const color = c.cambio > 0 ? 'text-emerald-700' : c.cambio < 0 ? 'text-red-700' : 'text-stone-500'
  return (
    <span className={'block text-[11px] ' + color} title={c.base ? `Comparado con el ${fechaCorta(c.base)}` : undefined}>
      {c.cambio > 0 ? '+' : ''}
      {num.format(c.cambio)}
      {porcentaje && c.porcentaje != null && ` (${c.porcentaje > 0 ? '+' : ''}${(c.porcentaje * 100).toFixed(1).replace('.', ',')} %)`}
    </span>
  )
}

export default function Perfiles() {
  const { actual } = useEspacio()
  const espacio = actual!.id
  const editable = puede.editar(actual?.rol)
  const marcas = useMarcas(espacio)
  const cuentas = useCuentas(espacio)
  const registros = useRegistros(espacio)
  const [marca, setMarca] = useState('')
  const [nuevaCuenta, setNuevaCuenta] = useState(false)
  const [foto, setFoto] = useState<{ cuenta: CuentaRed; registro: RegistroAuditoria | null } | null>(null)
  const [historial, setHistorial] = useState<string | null>(null)
  const [editarCuenta, setEditarCuenta] = useState<CuentaRed | null>(null)
  const [borrarCuenta, setBorrarCuenta] = useState<CuentaRed | null>(null)
  const qc = useQueryClient()
  const avisar = useNotas()

  useEffect(() => {
    if (!marca && marcas.data?.length) setMarca(marcas.data.find((m) => !m.archivada)?.id ?? marcas.data[0].id)
  }, [marcas.data, marca])

  const filas = useMemo(
    () =>
      (cuentas.data ?? [])
        .filter((c) => c.marca_id === marca)
        .map((c) => {
          const regs = (registros.data ?? []).filter((r) => r.cuenta_id === c.id)
          return { cuenta: c, registros: regs, comp: compararAuditoria(regs) }
        }),
    [cuentas.data, registros.data, marca],
  )

  const borrar = useMutation({
    mutationFn: async (id: string) => {
      const r = exigir(await supabase.from('cuentas_red').delete().eq('id', id).select('id'))
      if (r.length === 0) throw { code: '42501' }
    },
    onSuccess: () => {
      setBorrarCuenta(null)
      avisar('Perfil borrado.')
      qc.invalidateQueries({ queryKey: claveCuentas(espacio) })
      qc.invalidateQueries({ queryKey: ['auditoria', espacio] })
    },
    onError: (e) => avisar(mensajeError(e), 'error'),
  })

  function exportar(formato: Formato) {
    const m = marcas.data?.find((x) => x.id === marca)
    void exportarTabla(
      formato,
      `auditoria-${(m?.nombre ?? 'marca').replace(/[^\p{L}\p{N}]+/gu, '-')}-${hoyEn(actual!.zona_horaria)}`,
        ['Red', 'Perfil', 'Enlace', 'Fecha del registro', 'Seguidores', 'Cambio de seguidores (mes)', '% cambio seguidores (mes)', 'Última actividad', 'Frecuencia', 'Tráfico de referencia mensual', '% cambio tráfico (mes)', '% cambio tráfico (año)', 'Clics por publicación', 'Cambio de clics por publicación (mes)', 'Alcance', '% cambio alcance (semana)'],
        filas.map(({ cuenta: c, comp }) => [
          c.canal,
          c.nombre_perfil,
          c.enlace,
          comp?.actual.fecha ?? '',
          comp?.actual.seguidores,
          comp?.seguidoresMes.cambio,
          comp?.seguidoresMes.porcentaje,
          comp?.actual.ultima_actividad ?? '',
          comp?.actual.frecuencia ?? '',
          comp?.actual.trafico_referencia,
          comp?.traficoMes.porcentaje,
          comp?.traficoAnio.porcentaje,
          comp?.actual.clics_por_publicacion,
          comp?.clicsMes.cambio,
          comp?.actual.alcance,
          comp?.alcanceSemana.porcentaje,
        ]),
      'Auditoría',
    )
  }

  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Perfiles y auditoría"
        descripcion="Las cuentas de cada marca en cada red y una «foto» periódica de su estado. Los cambios frente a la semana, el mes o el año pasados se calculan con el historial."
        acciones={
          filas.length > 0 ? (
            <div className="flex gap-2">
              <Boton variante="secundario" onClick={() => exportar('xlsx')}>Descargar Excel</Boton>
              <Boton variante="secundario" onClick={() => exportar('csv')}>CSV</Boton>
            </div>
          ) : undefined
        }
      />

      {marcas.data && marcas.data.length === 0 && (
        <Aviso>
          Primero crea una marca.{' '}
          <Link className="font-medium underline" to="/marcas">
            Ir a marcas
          </Link>
        </Aviso>
      )}

      {marcas.data && marcas.data.length > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <Selector etiqueta="Marca" className="w-64" value={marca} onChange={(e) => setMarca(e.target.value)}>
            {marcas.data.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
                {m.archivada ? ' (archivada)' : ''}
              </option>
            ))}
          </Selector>
          {editable && !nuevaCuenta && <Boton onClick={() => setNuevaCuenta(true)}>Añadir perfil</Boton>}
        </div>
      )}

      {(nuevaCuenta || editarCuenta) && marca && (
        <FormularioCuenta
          espacio={espacio}
          marca={marca}
          cuenta={editarCuenta}
          alCerrar={() => {
            setNuevaCuenta(false)
            setEditarCuenta(null)
          }}
        />
      )}

      {foto && <FormularioFoto espacio={espacio} cuenta={foto.cuenta} registro={foto.registro} alCerrar={() => setFoto(null)} />}

      {(cuentas.isPending || registros.isPending) && <Cargando />}
      {(cuentas.error || registros.error) && <Aviso tipo="error">{mensajeError(cuentas.error ?? registros.error)}</Aviso>}

      {cuentas.data && marca && filas.length === 0 && !nuevaCuenta && (
        <Tarjeta titulo="Esta marca aún no tiene perfiles">
          <p className="text-sm text-stone-600">
            Añade sus cuentas (Instagram, TikTok…) y registra una foto con los seguidores de hoy. En un mes verás cuánto cambiaron.
          </p>
        </Tarjeta>
      )}

      {filas.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full min-w-[60rem] text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs text-stone-600">
              <tr>
                <th className="px-3 py-2 font-medium">Red y perfil</th>
                <th className="px-3 py-2 text-right font-medium">Seguidores (vs. mes)</th>
                <th className="px-3 py-2 font-medium">Última actividad</th>
                <th className="px-3 py-2 font-medium">Frecuencia</th>
                <th className="px-3 py-2 text-right font-medium">Tráfico ref. (mes / año)</th>
                <th className="px-3 py-2 text-right font-medium">Clics por pub. (vs. mes)</th>
                <th className="px-3 py-2 text-right font-medium">Alcance (vs. semana)</th>
                <th className="px-3 py-2 font-medium">Foto del</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 align-top">
              {filas.map(({ cuenta: c, registros: regs, comp }) => (
                <FilaCuenta
                  key={c.id}
                  cuenta={c}
                  registros={regs}
                  comp={comp}
                  editable={editable}
                  abierto={historial === c.id}
                  alternar={() => setHistorial(historial === c.id ? null : c.id)}
                  registrar={(registro) => setFoto({ cuenta: c, registro })}
                  editar={() => setEditarCuenta(c)}
                  borrar={() => setBorrarCuenta(c)}
                  espacio={espacio}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <DialogoConfirmar
        abierto={borrarCuenta !== null}
        titulo="¿Borrar este perfil?"
        textoConfirmar="Borrar perfil e historial"
        peligro
        cargando={borrar.isPending}
        onCerrar={() => setBorrarCuenta(null)}
        onConfirmar={() => borrarCuenta && borrar.mutate(borrarCuenta.id)}
      >
        <p>
          Se borrará {borrarCuenta?.canal} {borrarCuenta?.nombre_perfil} y todo su historial de auditoría. Si solo dejó de usarse, márcalo como
          inactivo editándolo.
        </p>
      </DialogoConfirmar>
    </div>
  )
}

function FilaCuenta({
  cuenta: c,
  registros,
  comp,
  editable,
  abierto,
  alternar,
  registrar,
  editar,
  borrar,
  espacio,
}: {
  cuenta: CuentaRed
  registros: RegistroAuditoria[]
  comp: ReturnType<typeof compararAuditoria<RegistroAuditoria>>
  editable: boolean
  abierto: boolean
  alternar: () => void
  registrar: (r: RegistroAuditoria | null) => void
  editar: () => void
  borrar: () => void
  espacio: string
}) {
  const qc = useQueryClient()
  const avisar = useNotas()
  const borrarRegistro = useMutation({
    mutationFn: async (id: string) => {
      const r = exigir(await supabase.from('registros_auditoria').delete().eq('id', id).select('id'))
      if (r.length === 0) throw { code: '42501' }
    },
    onSuccess: () => {
      avisar('Registro eliminado.')
      qc.invalidateQueries({ queryKey: ['auditoria', espacio] })
    },
    onError: (e) => avisar(mensajeError(e), 'error'),
  })
  const a = comp?.actual
  return (
    <>
      <tr className={c.activa ? '' : 'opacity-60'}>
        <td className="px-3 py-2">
          <span className="font-medium">{c.canal}</span>
          {!c.activa && <span className="ml-1 text-xs text-stone-500">(inactivo)</span>}
          <span className="block text-xs text-stone-500">
            {c.enlace ? (
              <a className="text-marca-700 hover:underline" href={c.enlace} target="_blank" rel="noopener noreferrer">
                {c.nombre_perfil || c.enlace} ↗
              </a>
            ) : (
              c.nombre_perfil || '—'
            )}
          </span>
          {c.frecuencia_objetivo && <span className="block text-[11px] text-stone-500">Meta: {c.frecuencia_objetivo}</span>}
        </td>
        <td className="px-3 py-2 text-right tabular-nums">
          {a?.seguidores == null ? '—' : num.format(a.seguidores)}
          {comp && <Variacion c={comp.seguidoresMes} />}
        </td>
        <td className="px-3 py-2">{fechaCorta(a?.ultima_actividad ?? null)}</td>
        <td className="px-3 py-2">{a?.frecuencia || '—'}</td>
        <td className="px-3 py-2 text-right tabular-nums">
          {a?.trafico_referencia == null ? '—' : num.format(a.trafico_referencia)}
          {comp && <Variacion c={comp.traficoMes} />}
          {comp && comp.traficoAnio.cambio != null && <Variacion c={comp.traficoAnio} />}
        </td>
        <td className="px-3 py-2 text-right tabular-nums">
          {a?.clics_por_publicacion == null ? '—' : num.format(a.clics_por_publicacion)}
          {comp && <Variacion c={comp.clicsMes} />}
        </td>
        <td className="px-3 py-2 text-right tabular-nums">
          {a?.alcance == null ? '—' : num.format(a.alcance)}
          {comp && <Variacion c={comp.alcanceSemana} />}
        </td>
        <td className="px-3 py-2 text-xs">{a ? fechaCorta(a.fecha) : 'Sin registros'}</td>
        <td className="whitespace-nowrap px-3 py-2 text-right text-xs">
          {editable && (
            <button type="button" className="font-medium text-marca-700 hover:underline" onClick={() => registrar(null)}>
              Registrar foto
            </button>
          )}
          {registros.length > 0 && (
            <button type="button" className="ml-3 text-stone-700 hover:underline" aria-expanded={abierto} onClick={alternar}>
              Historial ({registros.length})
            </button>
          )}
          {editable && (
            <>
              <button type="button" className="ml-3 text-stone-700 hover:underline" onClick={editar}>
                Editar
              </button>
              <button type="button" className="ml-3 text-red-700 hover:underline" onClick={borrar}>
                Borrar
              </button>
            </>
          )}
        </td>
      </tr>
      {abierto && (
        <tr>
          <td colSpan={9} className="bg-stone-50 px-3 py-2">
            <table className="w-full text-xs">
              <thead className="text-stone-500">
                <tr>
                  <th className="py-1 text-left font-medium">Fecha</th>
                  <th className="py-1 text-right font-medium">Seguidores</th>
                  <th className="py-1 text-left font-medium">Últ. actividad</th>
                  <th className="py-1 text-left font-medium">Frecuencia</th>
                  <th className="py-1 text-right font-medium">Tráfico</th>
                  <th className="py-1 text-right font-medium">Clics/pub.</th>
                  <th className="py-1 text-right font-medium">Alcance</th>
                  <th className="py-1 text-left font-medium">Notas</th>
                  {editable && <th />}
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {[...registros].reverse().map((r) => (
                  <tr key={r.id}>
                    <td className="py-1">{fechaCorta(r.fecha)}</td>
                    <td className="py-1 text-right">{r.seguidores == null ? '—' : num.format(r.seguidores)}</td>
                    <td className="py-1">{fechaCorta(r.ultima_actividad)}</td>
                    <td className="py-1">{r.frecuencia || '—'}</td>
                    <td className="py-1 text-right">{r.trafico_referencia == null ? '—' : num.format(r.trafico_referencia)}</td>
                    <td className="py-1 text-right">{r.clics_por_publicacion == null ? '—' : num.format(r.clics_por_publicacion)}</td>
                    <td className="py-1 text-right">{r.alcance == null ? '—' : num.format(r.alcance)}</td>
                    <td className="py-1">{r.notas}</td>
                    {editable && (
                      <td className="whitespace-nowrap py-1 text-right">
                        <button type="button" className="text-marca-700 hover:underline" onClick={() => registrar(r)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className="ml-2 text-red-700 hover:underline"
                          onClick={() => window.confirm(`¿Eliminar el registro del ${fechaCorta(r.fecha)}?`) && borrarRegistro.mutate(r.id)}
                        >
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  )
}

function FormularioCuenta({ espacio, marca, cuenta, alCerrar }: { espacio: string; marca: string; cuenta: CuentaRed | null; alCerrar: () => void }) {
  const qc = useQueryClient()
  const avisar = useNotas()
  const conocida = !cuenta || (CANALES as readonly string[]).includes(cuenta.canal)
  const [canal, setCanal] = useState(cuenta ? (conocida ? cuenta.canal : '__otra__') : 'Instagram')
  const [otra, setOtra] = useState(cuenta && !conocida ? cuenta.canal : '')
  const [nombre, setNombre] = useState(cuenta?.nombre_perfil ?? '')
  const [enlace, setEnlace] = useState(cuenta?.enlace ?? '')
  const [frecuencia, setFrecuencia] = useState(cuenta?.frecuencia_objetivo ?? '')
  const [activa, setActiva] = useState(cuenta?.activa ?? true)
  const canalFinal = canal === '__otra__' ? otra.trim() : canal
  const enlaceOk = enlace.trim() === '' || /^https?:\/\/\S+$/i.test(enlace.trim())
  const valido = canalFinal && enlaceOk

  const guardar = useMutation({
    mutationFn: async () => {
      const datos = { canal: canalFinal, nombre_perfil: nombre.trim(), enlace: enlace.trim(), frecuencia_objetivo: frecuencia.trim(), activa }
      if (cuenta) {
        const r = exigir(await supabase.from('cuentas_red').update(datos).eq('id', cuenta.id).select('id'))
        if (r.length === 0) throw { code: '42501' }
      } else exigir(await supabase.from('cuentas_red').insert({ ...datos, marca_id: marca, espacio_id: espacio }).select('id'))
    },
    onSuccess: () => {
      avisar(cuenta ? 'Perfil actualizado.' : 'Perfil añadido.')
      qc.invalidateQueries({ queryKey: claveCuentas(espacio) })
      alCerrar()
    },
    onError: (e) => {
      const err = e as { code?: string }
      avisar(err.code === '23505' ? 'Ese perfil ya existe en esa red para esta marca.' : mensajeError(e), 'error')
    },
  })

  return (
    <Tarjeta titulo={cuenta ? 'Editar perfil' : 'Nuevo perfil'}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Selector etiqueta="Red" value={canal} onChange={(e) => setCanal(e.target.value)}>
          {CANALES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
          <option value="__otra__">Otra (escribirla)…</option>
        </Selector>
        {canal === '__otra__' ? (
          <Campo etiqueta="Nombre de la red" required maxLength={60} placeholder="Ej.: Snapchat, Tumblr, Kwai" value={otra} onChange={(e) => setOtra(e.target.value)} />
        ) : (
          <div />
        )}
        <Campo etiqueta="Nombre de perfil" maxLength={120} placeholder="@usuario" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <Campo
          etiqueta="Enlace"
          type="url"
          placeholder="https://"
          value={enlace}
          onChange={(e) => setEnlace(e.target.value)}
          error={enlaceOk ? null : 'Debe empezar por https:// o http://'}
        />
        <Campo
          etiqueta="Frecuencia objetivo"
          maxLength={120}
          placeholder="Ej.: 4 por semana"
          value={frecuencia}
          onChange={(e) => setFrecuencia(e.target.value)}
        />
        {cuenta && (
          <label className="flex items-center gap-2 text-sm sm:self-end sm:pb-2">
            <input type="checkbox" className="size-4 accent-marca-700" checked={activa} onChange={(e) => setActiva(e.target.checked)} />
            Perfil activo
          </label>
        )}
      </div>
      {canal === '__otra__' && <p className="mt-2 text-xs text-stone-500">Las redes que añadas aquí también aparecerán al elegir redes en las publicaciones de esta marca.</p>}
      <div className="mt-4 flex gap-2">
        <Boton cargando={guardar.isPending} disabled={!valido} onClick={() => guardar.mutate()}>
          {cuenta ? 'Guardar' : 'Añadir perfil'}
        </Boton>
        <Boton variante="secundario" onClick={alCerrar}>
          Cancelar
        </Boton>
      </div>
    </Tarjeta>
  )
}

function FormularioFoto({ espacio, cuenta, registro, alCerrar }: { espacio: string; cuenta: CuentaRed; registro: RegistroAuditoria | null; alCerrar: () => void }) {
  const { actual } = useEspacio()
  const hoy = hoyEn(actual!.zona_horaria)
  const qc = useQueryClient()
  const avisar = useNotas()
  const [f, setF] = useState({
    fecha: registro?.fecha ?? hoy,
    seguidores: registro?.seguidores?.toString() ?? '',
    ultima_actividad: registro?.ultima_actividad ?? '',
    frecuencia: registro?.frecuencia ?? '',
    trafico_referencia: registro?.trafico_referencia?.toString() ?? '',
    clics_por_publicacion: registro?.clics_por_publicacion?.toString() ?? '',
    alcance: registro?.alcance?.toString() ?? '',
    notas: registro?.notas ?? '',
  })
  const n = {
    seguidores: aNumero(f.seguidores),
    trafico_referencia: aNumero(f.trafico_referencia),
    clics_por_publicacion: aNumero(f.clics_por_publicacion),
    alcance: aNumero(f.alcance),
  }
  const err = (v: number | null, entero = true) =>
    v != null && (Number.isNaN(v) || v < 0 || (entero && !Number.isInteger(v))) ? (entero ? 'Número entero ≥ 0' : 'Número ≥ 0') : null
  const errores = {
    seguidores: err(n.seguidores),
    trafico_referencia: err(n.trafico_referencia),
    clics_por_publicacion: err(n.clics_por_publicacion, false),
    alcance: err(n.alcance),
  }
  const valido = f.fecha && f.fecha <= hoy && !Object.values(errores).some(Boolean)

  const guardar = useMutation({
    mutationFn: async () => {
      const datos = { fecha: f.fecha, ultima_actividad: f.ultima_actividad || null, frecuencia: f.frecuencia.trim(), notas: f.notas.trim(), ...n }
      if (registro) {
        const r = exigir(await supabase.from('registros_auditoria').update(datos).eq('id', registro.id).select('id'))
        if (r.length === 0) throw { code: '42501' }
      } else exigir(await supabase.from('registros_auditoria').insert({ ...datos, cuenta_id: cuenta.id, espacio_id: espacio }).select('id'))
    },
    onSuccess: () => {
      avisar('Foto de auditoría guardada.')
      qc.invalidateQueries({ queryKey: ['auditoria', espacio] })
      alCerrar()
    },
    onError: (e) => {
      const er = e as { code?: string }
      avisar(er.code === '23505' ? 'Ya hay un registro de este perfil con esa fecha. Edítalo desde el historial.' : mensajeError(e), 'error')
    },
  })

  return (
    <Tarjeta titulo={`${registro ? 'Editar' : 'Registrar'} foto: ${cuenta.canal} ${cuenta.nombre_perfil}`}>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Campo etiqueta="Fecha" type="date" max={hoy} value={f.fecha} onChange={(e) => setF({ ...f, fecha: e.target.value })} error={f.fecha > hoy ? 'No puede ser futura' : null} />
        <Campo etiqueta="Seguidores" inputMode="numeric" value={f.seguidores} onChange={(e) => setF({ ...f, seguidores: e.target.value })} error={errores.seguidores} />
        <Campo etiqueta="Última actividad" type="date" max={hoy} value={f.ultima_actividad} onChange={(e) => setF({ ...f, ultima_actividad: e.target.value })} />
        <Campo etiqueta="Frecuencia de publicación" maxLength={120} placeholder="Ej.: 3 por semana" value={f.frecuencia} onChange={(e) => setF({ ...f, frecuencia: e.target.value })} />
        <Campo etiqueta="Tráfico de referencia mensual" inputMode="numeric" value={f.trafico_referencia} onChange={(e) => setF({ ...f, trafico_referencia: e.target.value })} error={errores.trafico_referencia} ayuda="Visitas a tu web desde esta red" />
        <Campo etiqueta="Clics por publicación" inputMode="decimal" value={f.clics_por_publicacion} onChange={(e) => setF({ ...f, clics_por_publicacion: e.target.value })} error={errores.clics_por_publicacion} />
        <Campo etiqueta="Alcance" inputMode="numeric" value={f.alcance} onChange={(e) => setF({ ...f, alcance: e.target.value })} error={errores.alcance} />
        <Campo etiqueta="Notas" maxLength={1000} value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} />
      </div>
      <div className="mt-4 flex gap-2">
        <Boton cargando={guardar.isPending} disabled={!valido} onClick={() => guardar.mutate()}>
          Guardar foto
        </Boton>
        <Boton variante="secundario" onClick={alCerrar}>
          Cancelar
        </Boton>
      </div>
    </Tarjeta>
  )
}
