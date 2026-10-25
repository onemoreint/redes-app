import { useEffect, useState } from 'react'
import { comprobarConexion, type EstadoConexion } from './lib/datos/supabase'

const ENTREGAS = [
  'Cuentas, espacios de trabajo, miembros y roles',
  'Marcas y estrategia',
  'Publicaciones y calendario editorial',
  'Revisión y aprobación',
  'Panel principal',
  'Métricas e informes',
  'Perfiles y auditoría',
  'Campañas',
  'Importar y exportar Excel/CSV',
  'Bienvenida, ayuda y entrega final',
]

export default function App() {
  const [conexion, setConexion] = useState<EstadoConexion | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    comprobarConexion(ctrl.signal).then((r) => {
      if (!ctrl.signal.aborted) setConexion(r)
    })
    return () => ctrl.abort()
  }, [])

  return (
    <div className="min-h-dvh">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-4">
          <span aria-hidden className="grid size-9 place-items-center rounded-lg bg-marca-700 text-sm font-bold text-white">
            r
          </span>
          <div>
            <h1 className="text-lg font-semibold leading-tight">redes-app</h1>
            <p className="text-sm text-stone-500">Gestión de redes sociales</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <section aria-labelledby="estado" className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 id="estado" className="text-base font-semibold">
            Estado del sistema
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            La app está en construcción. Esta versión solo comprueba que todo está conectado.
          </p>
          <div role="status" aria-live="polite" className="mt-4 flex items-start gap-2 text-sm">
            {conexion === null && (
              <>
                <span className="mt-1.5 size-2.5 shrink-0 animate-pulse rounded-full bg-stone-400" />
                <span>Comprobando la conexión con la base de datos…</span>
              </>
            )}
            {conexion?.ok === true && (
              <>
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-emerald-500" />
                <span>Conexión con la base de datos: correcta.</span>
              </>
            )}
            {conexion?.ok === false && (
              <>
                <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-red-500" />
                <span>
                  No se pudo conectar con la base de datos. {conexion.motivo}
                </span>
              </>
            )}
          </div>
        </section>

        <section aria-labelledby="plan" className="mt-6">
          <h2 id="plan" className="text-base font-semibold">
            Próximas entregas
          </h2>
          <ol className="mt-3 space-y-2">
            {ENTREGAS.map((e, i) => (
              <li key={e} className="flex gap-3 rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm">
                <span className="w-5 shrink-0 text-right font-medium text-stone-400">{i + 1}</span>
                <span>{e}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="mx-auto max-w-3xl px-4 pb-8 text-xs text-stone-500">
        Versión {__APP_VERSION__} · entrega 0
      </footer>
    </div>
  )
}
