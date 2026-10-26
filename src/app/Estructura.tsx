import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEspacio } from './espacio'
import { useSesion } from './sesion'
import { usePerfil } from '../modules/cuenta/MiCuenta'
import { NOMBRE_ROL } from '../lib/roles'
import { Firma } from '../components/Firma'
import { Selector } from '../components/ui'

const ENLACES = [
  { a: '/', texto: 'Inicio', fin: true },
  { a: '/calendario', texto: 'Calendario' },
  { a: '/marcas', texto: 'Marcas' },
  { a: '/miembros', texto: 'Miembros' },
  { a: '/ajustes', texto: 'Ajustes del espacio' },
]

function Navegacion({ alNavegar }: { alNavegar?: () => void }) {
  const { espacios, actual, elegir } = useEspacio()
  const { sesion } = useSesion()
  const perfil = usePerfil()
  const navegar = useNavigate()

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link to="/" onClick={alNavegar} className="flex items-center gap-3">
        <span aria-hidden className="grid size-9 place-items-center rounded-lg bg-marca-700 text-sm font-bold text-white">
          r
        </span>
        <span className="text-base font-semibold">redes-app</span>
      </Link>

      {actual && (
        <div>
          <Selector
            etiqueta="Espacio de trabajo"
            value={actual.id}
            onChange={(e) => {
              if (e.target.value === '__nuevo__') navegar('/nuevo-espacio')
              else {
                elegir(e.target.value)
                navegar('/')
              }
              alNavegar?.()
            }}
            ayuda={`Tu rol: ${NOMBRE_ROL[actual.rol]}`}
          >
            {espacios.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
            <option value="__nuevo__">+ Crear otro espacio…</option>
          </Selector>
        </div>
      )}

      <nav aria-label="Principal">
        <ul className="space-y-1">
          {ENLACES.map((l) => (
            <li key={l.a}>
              <NavLink
                to={l.a}
                end={l.fin}
                onClick={alNavegar}
                className={({ isActive }) =>
                  'block rounded-lg px-3 py-2 text-sm font-medium ' +
                  (isActive ? 'bg-marca-50 text-marca-800' : 'text-stone-700 hover:bg-stone-100')
                }
              >
                {l.texto}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto space-y-4 border-t border-stone-200 pt-4">
        <NavLink
          to="/cuenta"
          onClick={alNavegar}
          className={({ isActive }) =>
            'block rounded-lg px-3 py-2 text-sm ' + (isActive ? 'bg-marca-50 text-marca-800' : 'text-stone-700 hover:bg-stone-100')
          }
        >
          <span className="block font-medium">{perfil.data?.nombre || 'Mi cuenta'}</span>
          <span className="block truncate text-xs text-stone-500">{sesion?.user.email}</span>
        </NavLink>
        <div className="px-3">
          <Firma compacta />
        </div>
      </div>
    </div>
  )
}

export default function Estructura() {
  const [menu, setMenu] = useState(false)
  const ubicacion = useLocation()
  useEffect(() => setMenu(false), [ubicacion.pathname])

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">
        Saltar al contenido
      </a>

      <aside className="sticky top-0 hidden h-dvh border-r border-stone-200 bg-white lg:block">
        <Navegacion />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-stone-200 bg-white px-4 py-3 lg:hidden">
        <Link to="/" className="flex items-center gap-2">
          <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-marca-700 text-sm font-bold text-white">
            r
          </span>
          <span className="font-semibold">redes-app</span>
        </Link>
        <button
          type="button"
          onClick={() => setMenu(true)}
          aria-expanded={menu}
          aria-controls="menu-movil"
          className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium"
        >
          Menú
        </button>
      </header>

      {menu && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" aria-label="Cerrar menú" className="absolute inset-0 bg-stone-900/40" onClick={() => setMenu(false)} />
          <div id="menu-movil" className="absolute inset-y-0 left-0 w-72 max-w-[85vw] overflow-y-auto bg-white shadow-xl">
            <div className="flex justify-end p-2">
              <button type="button" onClick={() => setMenu(false)} className="rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-stone-100">
                Cerrar
              </button>
            </div>
            <Navegacion alNavegar={() => setMenu(false)} />
          </div>
        </div>
      )}

      <main id="contenido" className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:py-10">
        <Outlet />
      </main>
    </div>
  )
}
