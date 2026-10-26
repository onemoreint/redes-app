import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

// ---------------------------------------------------------------------------
// Botón
// ---------------------------------------------------------------------------
type Variante = 'primario' | 'secundario' | 'peligro' | 'fantasma'
const ESTILO_BOTON: Record<Variante, string> = {
  primario: 'bg-marca-700 text-white hover:bg-marca-800 disabled:bg-marca-700/50',
  secundario: 'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 disabled:text-stone-400',
  peligro: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-600/50',
  fantasma: 'text-stone-700 hover:bg-stone-100 disabled:text-stone-400',
}

export function Boton({
  variante = 'primario',
  cargando = false,
  className,
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante; cargando?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={cx(
        'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed',
        ESTILO_BOTON[variante],
        className,
      )}
    >
      {cargando && <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />}
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Campos de formulario
// ---------------------------------------------------------------------------
const ESTILO_CONTROL =
  'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 disabled:bg-stone-100 disabled:text-stone-500'

export function Campo({
  etiqueta,
  ayuda,
  error,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { etiqueta: string; ayuda?: ReactNode; error?: string | null }) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-stone-800">
        {etiqueta}
        {props.required && <span className="text-red-600"> *</span>}
      </label>
      <input
        id={id}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || ayuda ? `${id}-desc` : undefined}
        className={cx(ESTILO_CONTROL, error ? 'border-red-400' : 'border-stone-300')}
      />
      {(error || ayuda) && (
        <p id={`${id}-desc`} className={cx('mt-1 text-xs', error ? 'text-red-700' : 'text-stone-500')}>
          {error || ayuda}
        </p>
      )}
    </div>
  )
}

export function Areatexto({
  etiqueta,
  ayuda,
  error,
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { etiqueta: string; ayuda?: ReactNode; error?: string | null }) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-stone-800">
        {etiqueta}
      </label>
      <textarea
        id={id}
        rows={3}
        {...props}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || ayuda ? `${id}-desc` : undefined}
        className={cx(ESTILO_CONTROL, 'resize-y', error ? 'border-red-400' : 'border-stone-300')}
      />
      {(error || ayuda) && (
        <p id={`${id}-desc`} className={cx('mt-1 text-xs', error ? 'text-red-700' : 'text-stone-500')}>
          {error || ayuda}
        </p>
      )}
    </div>
  )
}

export function BarraProgreso({ porcentaje, etiqueta }: { porcentaje: number; etiqueta: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-stone-600">
        <span>{etiqueta}</span>
        <span className="font-medium">{porcentaje} %</span>
      </div>
      <div
        role="progressbar"
        aria-label={etiqueta}
        aria-valuenow={porcentaje}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 overflow-hidden rounded-full bg-stone-100"
      >
        <div className="h-full rounded-full bg-marca-600 transition-all" style={{ width: `${porcentaje}%` }} />
      </div>
    </div>
  )
}

export function Selector({
  etiqueta,
  ayuda,
  className,
  children,
  ocultarEtiqueta,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { etiqueta: string; ayuda?: ReactNode; ocultarEtiqueta?: boolean }) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className={cx('mb-1 block text-sm font-medium text-stone-800', ocultarEtiqueta && 'sr-only')}>
        {etiqueta}
      </label>
      <select
        id={id}
        {...props}
        aria-describedby={ayuda ? `${id}-desc` : undefined}
        className={cx(ESTILO_CONTROL, 'border-stone-300')}
      >
        {children}
      </select>
      {ayuda && (
        <p id={`${id}-desc`} className="mt-1 text-xs text-stone-500">
          {ayuda}
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Avisos y estados
// ---------------------------------------------------------------------------
const ESTILO_AVISO = {
  info: 'border-sky-200 bg-sky-50 text-sky-900',
  exito: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  alerta: 'border-amber-200 bg-amber-50 text-amber-900',
}

export function Aviso({ tipo = 'info', children }: { tipo?: keyof typeof ESTILO_AVISO; children: ReactNode }) {
  return (
    <div role={tipo === 'error' ? 'alert' : 'status'} className={cx('rounded-lg border px-4 py-3 text-sm', ESTILO_AVISO[tipo])}>
      {children}
    </div>
  )
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div role="status" className="flex items-center gap-2 py-6 text-sm text-stone-500">
      <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-stone-400 border-r-transparent" />
      {texto}
    </div>
  )
}

export function Tarjeta({ titulo, descripcion, children, acciones }: { titulo?: string; descripcion?: ReactNode; children?: ReactNode; acciones?: ReactNode }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5">
      {(titulo || acciones) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {titulo && <h2 className="text-base font-semibold">{titulo}</h2>}
            {descripcion && <p className="mt-1 text-sm text-stone-600">{descripcion}</p>}
          </div>
          {acciones}
        </div>
      )}
      {children}
    </section>
  )
}

export function Encabezado({ titulo, descripcion, acciones }: { titulo: string; descripcion?: ReactNode; acciones?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{titulo}</h1>
        {descripcion && <p className="mt-1 text-sm text-stone-600">{descripcion}</p>}
      </div>
      {acciones}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Diálogo de confirmación (accesible, con <dialog> nativo)
// ---------------------------------------------------------------------------
export function DialogoConfirmar({
  abierto,
  titulo,
  children,
  textoConfirmar,
  peligro = false,
  cargando = false,
  confirmarDeshabilitado = false,
  onConfirmar,
  onCerrar,
}: {
  abierto: boolean
  titulo: string
  children: ReactNode
  textoConfirmar: string
  peligro?: boolean
  cargando?: boolean
  confirmarDeshabilitado?: boolean
  onConfirmar: () => void
  onCerrar: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const idTitulo = useId()
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (abierto && !d.open) d.showModal()
    if (!abierto && d.open) d.close()
  }, [abierto])
  return (
    <dialog
      ref={ref}
      aria-labelledby={idTitulo}
      onCancel={(e) => {
        e.preventDefault()
        if (!cargando) onCerrar()
      }}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-stone-200 p-0 shadow-xl backdrop:bg-stone-900/40"
    >
      <div className="p-5">
        <h2 id={idTitulo} className="text-base font-semibold">
          {titulo}
        </h2>
        <div className="mt-2 text-sm text-stone-700">{children}</div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Boton variante="secundario" onClick={onCerrar} disabled={cargando}>
            Volver
          </Boton>
          <Boton variante={peligro ? 'peligro' : 'primario'} onClick={onConfirmar} cargando={cargando} disabled={confirmarDeshabilitado}>
            {textoConfirmar}
          </Boton>
        </div>
      </div>
    </dialog>
  )
}

// ---------------------------------------------------------------------------
// Notificaciones breves
// ---------------------------------------------------------------------------
type Nota = { id: number; texto: string; tipo: 'exito' | 'error' }
const NotasCtx = createContext<(texto: string, tipo?: Nota['tipo']) => void>(() => {})

export function ProveedorNotas({ children }: { children: ReactNode }) {
  const [notas, setNotas] = useState<Nota[]>([])
  const avisar = useCallback((texto: string, tipo: Nota['tipo'] = 'exito') => {
    const id = Date.now() + Math.random()
    setNotas((n) => [...n, { id, texto, tipo }])
    setTimeout(() => setNotas((n) => n.filter((x) => x.id !== id)), tipo === 'error' ? 7000 : 4000)
  }, [])
  return (
    <NotasCtx.Provider value={avisar}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
        {notas.map((n) => (
          <div
            key={n.id}
            role={n.tipo === 'error' ? 'alert' : 'status'}
            className={cx(
              'pointer-events-auto max-w-md rounded-lg px-4 py-3 text-sm shadow-lg',
              n.tipo === 'error' ? 'bg-red-700 text-white' : 'bg-stone-900 text-white',
            )}
          >
            {n.texto}
          </div>
        ))}
      </div>
    </NotasCtx.Provider>
  )
}

export const useNotas = () => useContext(NotasCtx)
