import { lazy } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { ProveedorSesion, useSesion } from './app/sesion'
import { ProveedorEspacio, useEspacio } from './app/espacio'
import Estructura from './app/Estructura'
import { Entrar, PantallaAcceso, Recuperar, Registro, Restablecer } from './modules/cuenta/acceso'
import MiCuenta from './modules/cuenta/MiCuenta'
import Inicio from './modules/espacios/Inicio'
import AceptarInvitacion from './modules/espacios/AceptarInvitacion'
import { FormularioCrearEspacio } from './modules/espacios/CrearEspacio'
import { Aviso, Cargando, Encabezado, ProveedorNotas, Tarjeta } from './components/ui'
import { mensajeError } from './lib/datos/errores'
import { supabase } from './lib/datos/supabase'

// Cada página se descarga al visitarla por primera vez (carga inicial más ligera).
const Miembros = lazy(() => import('./modules/espacios/Miembros'))
const AjustesEspacio = lazy(() => import('./modules/espacios/AjustesEspacio'))
const Marcas = lazy(() => import('./modules/marcas/Marcas'))
const Campanas = lazy(() => import('./modules/campanas/Campanas'))
const FichaCampana = lazy(() => import('./modules/campanas/Campanas').then((m) => ({ default: m.FichaCampana })))
const Perfiles = lazy(() => import('./modules/auditoria/Perfiles'))
const Informes = lazy(() => import('./modules/metricas/Informes'))
const Revision = lazy(() => import('./modules/revision/Revision'))
const Importar = lazy(() => import('./modules/importar/Importar'))
const Ayuda = lazy(() => import('./modules/ayuda/Ayuda'))
const Calendario = lazy(() => import('./modules/publicaciones/Calendario'))
const EditorPublicacion = lazy(() => import('./modules/publicaciones/Editor'))
const FichaMarca = lazy(() => import('./modules/marcas/FichaMarca'))

const clienteConsultas = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true, staleTime: 30_000 } },
})

/** Exige sesión iniciada; si no, manda a "Entrar" y vuelve aquí después. */
function ConSesion() {
  const { sesion, cargando, recuperando } = useSesion()
  const ubicacion = useLocation()
  if (cargando) return <div className="px-4"><Cargando /></div>
  if (recuperando) return <Navigate to="/restablecer" replace />
  if (!sesion) {
    const siguiente = ubicacion.pathname + ubicacion.search
    return <Navigate to={siguiente === '/' ? '/entrar' : `/entrar?siguiente=${encodeURIComponent(siguiente)}`} replace />
  }
  return <Outlet />
}

/** Exige al menos un espacio; si no hay, muestra la bienvenida para crear el primero. */
function ConEspacio() {
  const { actual, cargando, error } = useEspacio()
  if (cargando) return <Cargando />
  if (error) return <Aviso tipo="error">{mensajeError(error)}</Aviso>
  if (!actual) return <Bienvenida />
  return <Outlet />
}

function Bienvenida() {
  return (
    <PantallaAcceso
      titulo="Crea tu primer espacio de trabajo"
      descripcion="Un espacio agrupa tus marcas y a las personas que trabajan contigo. Si alguien te invitó a su espacio, abre el enlace que te envió."
    >
      <FormularioCrearEspacio />
      <p className="mt-5 border-t border-stone-100 pt-4 text-sm text-stone-600">
        ¿Entraste con otra cuenta?{' '}
        <button type="button" className="font-medium text-marca-700 hover:underline" onClick={() => supabase.auth.signOut()}>
          Cerrar sesión
        </button>
      </p>
    </PantallaAcceso>
  )
}

function NuevoEspacio() {
  return (
    <div className="space-y-6">
      <Encabezado titulo="Nuevo espacio de trabajo" descripcion="Serás su administrador." />
      <Tarjeta>
        <FormularioCrearEspacio />
      </Tarjeta>
    </div>
  )
}

function NoEncontrado() {
  return (
    <div className="space-y-4">
      <Encabezado titulo="Página no encontrada" descripcion="La dirección no existe o cambió." />
      <Link className="text-sm text-marca-700 hover:underline" to="/">
        Ir al inicio
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={clienteConsultas}>
      <ProveedorNotas>
        <ProveedorSesion>
          <ProveedorEspacio>
            <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <Routes>
                <Route path="/entrar" element={<Entrar />} />
                <Route path="/registro" element={<Registro />} />
                <Route path="/recuperar" element={<Recuperar />} />
                <Route path="/restablecer" element={<Restablecer />} />
                <Route path="/invitacion/:token" element={<AceptarInvitacion />} />
                <Route element={<ConSesion />}>
                  <Route element={<ConEspacio />}>
                    <Route element={<Estructura />}>
                      <Route index element={<Inicio />} />
                      <Route path="calendario" element={<Calendario />} />
                      <Route path="publicaciones/nueva" element={<EditorPublicacion key="nueva" />} />
                      <Route path="publicaciones/:id" element={<EditorPublicacion />} />
                      <Route path="revision" element={<Revision />} />
                      <Route path="informes" element={<Informes />} />
                      <Route path="importar" element={<Importar />} />
                      <Route path="ayuda" element={<Ayuda />} />
                      <Route path="campanas" element={<Campanas />} />
                      <Route path="campanas/:id" element={<FichaCampana />} />
                      <Route path="perfiles" element={<Perfiles />} />
                      <Route path="marcas" element={<Marcas />} />
                      <Route path="marcas/:id" element={<FichaMarca />} />
                      <Route path="miembros" element={<Miembros />} />
                      <Route path="ajustes" element={<AjustesEspacio />} />
                      <Route path="cuenta" element={<MiCuenta />} />
                      <Route path="nuevo-espacio" element={<NuevoEspacio />} />
                      <Route path="*" element={<NoEncontrado />} />
                    </Route>
                  </Route>
                </Route>
              </Routes>
            </BrowserRouter>
          </ProveedorEspacio>
        </ProveedorSesion>
      </ProveedorNotas>
    </QueryClientProvider>
  )
}
