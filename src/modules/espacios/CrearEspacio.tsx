import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/datos/supabase'
import { exigir, mensajeError } from '../../lib/datos/errores'
import { Aviso, Boton, Campo, Selector } from '../../components/ui'
import { claveEspacios, useEspacio } from '../../app/espacio'
import { useSesion } from '../../app/sesion'
import { zonaDelNavegador, zonasHorarias } from './zonas'

export function FormularioCrearEspacio({ alCrear }: { alCrear?: () => void }) {
  const { sesion } = useSesion()
  const { elegir } = useEspacio()
  const qc = useQueryClient()
  const navegar = useNavigate()
  const [nombre, setNombre] = useState('')
  const [zona, setZona] = useState(() => {
    const z = zonaDelNavegador()
    return zonasHorarias().includes(z) ? z : 'America/Bogota'
  })
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    setError(null)
    setEnviando(true)
    try {
      const id = exigir(await supabase.rpc('crear_espacio', { p_nombre: nombre.trim(), p_zona_horaria: zona }))
      await qc.invalidateQueries({ queryKey: claveEspacios(sesion?.user.id) })
      elegir(id)
      alCrear?.()
      navegar('/')
    } catch (err) {
      setError(mensajeError(err))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4" noValidate>
      {error && <Aviso tipo="error">{error}</Aviso>}
      <Campo
        etiqueta="Nombre del espacio"
        required
        maxLength={80}
        placeholder="Ej.: Mis marcas, Agencia Lugo, Cliente Óptica Visión"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        ayuda="Un espacio agrupa marcas y personas. Puedes tener uno para tus marcas y otro por cada cliente."
      />
      <Selector
        etiqueta="Zona horaria"
        value={zona}
        onChange={(e) => setZona(e.target.value)}
        ayuda="Define qué día y hora es «hoy» para el calendario y para saber si algo está atrasado."
      >
        {zonasHorarias().map((z) => (
          <option key={z} value={z}>
            {z.replaceAll('_', ' ')}
          </option>
        ))}
      </Selector>
      <Boton type="submit" cargando={enviando} disabled={!nombre.trim()}>
        Crear espacio
      </Boton>
    </form>
  )
}
