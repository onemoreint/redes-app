import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/datos/supabase'
import { exigir } from '../../lib/datos/errores'
import { DESCRIPCION_ROL, NOMBRE_ROL, puede } from '../../lib/roles'
import { Encabezado, Tarjeta } from '../../components/ui'
import { useEspacio } from '../../app/espacio'
import { usePerfil } from '../cuenta/MiCuenta'

export default function Inicio() {
  const { actual } = useEspacio()
  const perfil = usePerfil()
  const esAdmin = puede.administrarEspacio(actual?.rol)

  const resumen = useQuery({
    queryKey: ['resumen-espacio', actual!.id],
    queryFn: async () => {
      const { count } = await supabase.from('miembros').select('*', { count: 'exact', head: true }).eq('espacio_id', actual!.id)
      const invitaciones = esAdmin
        ? exigir(
            await supabase
              .from('invitaciones')
              .select('id, expira_en')
              .eq('espacio_id', actual!.id)
              .is('aceptada_en', null),
          ).filter((i) => new Date(i.expira_en) > new Date()).length
        : null
      return { miembros: count ?? 0, invitaciones }
    },
  })

  const nombre = perfil.data?.nombre?.split(' ')[0]

  return (
    <div className="space-y-6">
      <Encabezado titulo={nombre ? `Hola, ${nombre}` : 'Inicio'} descripcion={`Espacio: ${actual!.nombre}`} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Indicador titulo="Tu rol" valor={NOMBRE_ROL[actual!.rol]} detalle={DESCRIPCION_ROL[actual!.rol]} />
        <Indicador
          titulo="Miembros"
          valor={resumen.data ? String(resumen.data.miembros) : '…'}
          detalle={<Link className="text-marca-700 hover:underline" to="/miembros">Ver miembros</Link>}
        />
        {esAdmin && (
          <Indicador
            titulo="Invitaciones pendientes"
            valor={resumen.data?.invitaciones != null ? String(resumen.data.invitaciones) : '…'}
            detalle={<Link className="text-marca-700 hover:underline" to="/miembros">Invitar a alguien</Link>}
          />
        )}
      </div>

      <Tarjeta titulo="Lo que viene" descripcion="La app se construye por entregas. Cada una se publica en cuanto pasa sus pruebas.">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-stone-700">
          <li className="text-stone-400 line-through">Cuentas, espacios de trabajo, miembros y roles</li>
          <li className="text-stone-400 line-through">Marcas y estrategia</li>
          <li className="text-stone-400 line-through">Publicaciones y calendario editorial</li>
          <li className="text-stone-400 line-through">Revisión y aprobación</li>
          <li>Panel principal</li>
          <li>Métricas e informes</li>
          <li>Perfiles y auditoría</li>
          <li>Campañas</li>
          <li>Importar y exportar Excel/CSV</li>
          <li>Bienvenida, ayuda y entrega final</li>
        </ol>
      </Tarjeta>
    </div>
  )
}

function Indicador({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{titulo}</p>
      <p className="mt-1 text-2xl font-semibold">{valor}</p>
      {detalle && <div className="mt-1 text-xs text-stone-600">{detalle}</div>}
    </div>
  )
}
