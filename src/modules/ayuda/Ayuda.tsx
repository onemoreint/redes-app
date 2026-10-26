import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Encabezado, Tarjeta } from '../../components/ui'
import { DESCRIPCION_ROL, NOMBRE_ROL, ROLES } from '../../lib/roles'
import { ESTADOS, ETAPAS } from '../../lib/calculos/publicaciones'
import { AYUDA_ESTADO, COLOR_ESTADO, NOMBRE_ESTADO, NOMBRE_ETAPA } from '../publicaciones/catalogos'
import { LIMITE_CARACTERES } from '../../lib/canales'

function Pregunta({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <details className="group border-t border-stone-100 py-3 first:border-t-0">
      <summary className="cursor-pointer list-none text-sm font-medium text-stone-900 marker:hidden">
        <span className="mr-2 inline-block text-stone-400 transition-transform group-open:rotate-90" aria-hidden>
          ›
        </span>
        {titulo}
      </summary>
      <div className="mt-2 space-y-2 pl-5 text-sm text-stone-700">{children}</div>
    </details>
  )
}

const Indicador = ({ nombre, children }: { nombre: string; children: ReactNode }) => (
  <div className="border-t border-stone-100 py-3 first:border-t-0">
    <dt className="text-sm font-medium">{nombre}</dt>
    <dd className="mt-1 text-sm text-stone-700">{children}</dd>
  </div>
)

export default function Ayuda() {
  return (
    <div className="space-y-6">
      <Encabezado titulo="Ayuda" descripcion="Cómo funciona la app, qué significa cada estado y cómo se calcula cada cifra." />

      <nav aria-label="En esta página" className="flex flex-wrap gap-2 text-sm">
        {[
          ['empezar', 'Primeros pasos'],
          ['estados', 'Estados'],
          ['roles', 'Roles'],
          ['indicadores', 'Indicadores'],
          ['importar', 'Importar'],
          ['copias', 'Copias de seguridad'],
          ['limites', 'Limitaciones'],
          ['preguntas', 'Preguntas frecuentes'],
        ].map(([id, t]) => (
          <a key={id} href={`#${id}`} className="rounded-full bg-stone-100 px-3 py-1 text-stone-700 hover:bg-stone-200">
            {t}
          </a>
        ))}
      </nav>

      <section id="empezar" className="scroll-mt-6">
        <Tarjeta titulo="Primeros pasos">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-stone-700">
            <li>
              <Link className="text-marca-700 underline" to="/marcas">Crea una marca</Link> (o varias: cada cliente o proyecto es una marca).
            </li>
            <li>Rellena su <strong>estrategia</strong> y sus <strong>objetivos</strong> en la ficha de la marca.</li>
            <li>
              Añade sus <Link className="text-marca-700 underline" to="/perfiles">perfiles en redes</Link> y registra una primera foto de auditoría.
            </li>
            <li>
              Planifica publicaciones en el <Link className="text-marca-700 underline" to="/calendario">calendario</Link>, o{' '}
              <Link className="text-marca-700 underline" to="/importar">importa tus plantillas de Excel</Link>.
            </li>
            <li>Si trabajas en equipo, <Link className="text-marca-700 underline" to="/miembros">invita miembros</Link> con el rol adecuado.</li>
            <li>Cuando publiques, anota en cada publicación sus <strong>resultados</strong>; los verás en <Link className="text-marca-700 underline" to="/informes">Informes</Link>.</li>
          </ol>
        </Tarjeta>
      </section>

      <section id="estados" className="scroll-mt-6">
        <Tarjeta titulo="Estados de una publicación" descripcion="«Atrasada» no es un estado: se calcula cuando la fecha prevista ya pasó y la publicación sigue en borrador, en revisión, aprobada o programada.">
          <ul className="space-y-2">
            {ESTADOS.map((e) => (
              <li key={e} className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLOR_ESTADO[e]}`}>{NOMBRE_ESTADO[e]}</span>
                <span className="text-stone-700">{AYUDA_ESTADO[e]}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-stone-700">
            Flujo de revisión: una idea o borrador se envía <em>a revisión</em>; un revisor, editor o administrador la <em>aprueba</em> o la <em>devuelve</em> a borrador con un comentario.
          </p>
          <h3 className="mt-4 text-sm font-semibold">Etapas del embudo</h3>
          <p className="mt-1 text-sm text-stone-700">{ETAPAS.map((e) => NOMBRE_ETAPA[e]).join(' → ')}</p>
        </Tarjeta>
      </section>

      <section id="roles" className="scroll-mt-6">
        <Tarjeta titulo="Roles">
          <dl>
            {ROLES.map((r) => (
              <Indicador key={r} nombre={NOMBRE_ROL[r]}>{DESCRIPCION_ROL[r]}</Indicador>
            ))}
          </dl>
          <p className="mt-3 text-xs text-stone-500">Los permisos se comprueban en la base de datos, no solo en la pantalla.</p>
        </Tarjeta>
      </section>

      <section id="indicadores" className="scroll-mt-6">
        <Tarjeta titulo="Cómo se calcula cada cifra" descripcion="Todas las cifras salen de lo que registras en la app. Si falta un dato, se muestra «—» en lugar de inventar un valor.">
          <dl>
            <Indicador nombre="Compromiso">Compartidos + me gusta + comentarios + guardados + menciones + clics. (La plantilla original sumaba solo retweets, me gusta, menciones y clics; con comentarios y guardados en 0 da lo mismo.)</Indicador>
            <Indicador nombre="Tasa de compromiso">Compromiso ÷ alcance. Sin alcance no se calcula.</Indicador>
            <Indicador nombre="Resultados de una publicación">Se cuenta cada publicación en cada red. Vale la medición más reciente que registraste; la fecha es la de publicación real en esa red o, si no la anotaste, la prevista.</Indicador>
            <Indicador nombre="Comparación con el periodo anterior">Variación = (actual − anterior) ÷ anterior. Si el periodo anterior es 0, no se muestra porcentaje.</Indicador>
            <Indicador nombre="Semana típica">Promedio semanal de los 30 días anteriores al periodo: total de esos 30 días ÷ 30 × 7.</Indicador>
            <Indicador nombre="Cumplimiento del calendario">De las publicaciones cuya fecha prevista ya pasó (sin contar descartadas), el porcentaje que está Publicado.</Indicador>
            <Indicador nombre="Tablero mensual">Publicaciones por semana del mes, por día de la semana y por formato, contadas a partir de la fecha prevista en la zona horaria del espacio.</Indicador>
            <Indicador nombre="Cambios en la auditoría">«Mes pasado» es el registro más reciente con al menos 30 días de antigüedad respecto al actual (semana: 7 días; año: 365). Cambio = actual − anterior; % = cambio ÷ anterior.</Indicador>
            <Indicador nombre="Avance de la estrategia">Cada respuesta escrita y cada casilla marcada suma un punto; tener al menos un objetivo suma otro.</Indicador>
            <Indicador nombre="Avance de una campaña">Cuántas publicaciones tiene la campaña y cuántas están en estado Publicado, más el reparto por estado y sus resultados sumados.</Indicador>
            <Indicador nombre="Límite de caracteres">
              Aviso orientativo, no bloquea: {Object.entries(LIMITE_CARACTERES).map(([red, n]) => `${red} ${n?.toLocaleString('es')}`).join(' · ')}.
            </Indicador>
          </dl>
        </Tarjeta>
      </section>

      <section id="importar" className="scroll-mt-6">
        <Tarjeta titulo="Importar desde Excel o CSV">
          <ul className="list-disc space-y-2 pl-5 text-sm text-stone-700">
            <li>Admite .xlsx y .csv (separado por punto y coma o por coma). Si tienes un .xls antiguo, ábrelo en Excel y guárdalo como .xlsx.</li>
            <li>Reconoce las plantillas Horario, Plan de contenido, Plan multicanal y Plan de publicación con tablero (publicaciones), y Auditoría (registros de perfiles), incluidos sus nombres de columna traducidos («CORREO» es el texto, «GORJEO» es X).</li>
            <li>Las plantillas de Informe y de Plan estratégico son resúmenes: sus datos se registran en Informes y en Marcas → Estrategia.</li>
            <li>Fechas: día/mes/año, año-mes-día o fechas de Excel. Las filas solo con estado o categoría (las listas de ejemplo de las plantillas) se ignoran.</li>
            <li>Una red se marca con cualquier valor en su columna («x», «sí»…). Vacío, «no» o «0» = no.</li>
            <li>Antes de guardar ves cada fila con su resultado. Lo que ya existe (mismo título y día) se marca como posible duplicado y no se importa salvo que lo pidas. <strong>Nunca se reemplaza nada.</strong></li>
            <li>«Asignado a», semana y día de la semana se guardan en las notas de la publicación.</li>
          </ul>
        </Tarjeta>
      </section>

      <section id="copias" className="scroll-mt-6">
        <Tarjeta titulo="Copias de seguridad">
          <p className="text-sm text-stone-700">
            En <Link className="text-marca-700 underline" to="/ajustes">Ajustes del espacio</Link> un administrador puede descargar una copia (.json) con todo el contenido del espacio. Hazla con regularidad: el plan gratuito de la base de datos no guarda copias automáticas y se pausa tras una semana sin uso (los datos no se pierden; se reactiva desde su panel).
          </p>
        </Tarjeta>
      </section>

      <section id="limites" className="scroll-mt-6">
        <Tarjeta titulo="Lo que la app no hace">
          <ul className="list-disc space-y-2 pl-5 text-sm text-stone-700">
            <li>No se conecta con las redes sociales: no publica, no programa en ellas y no lee estadísticas. Las cifras se registran a mano.</li>
            <li>«Programado» es un recordatorio para ti, no una publicación automática.</li>
            <li>No envía correos de invitación: se comparte un enlace que caduca a los 7 días y solo sirve para el correo invitado.</li>
            <li>No guarda imágenes ni videos; usa el campo «Recursos visuales» para enlazarlos.</li>
          </ul>
        </Tarjeta>
      </section>

      <section id="preguntas" className="scroll-mt-6">
        <Tarjeta titulo="Preguntas frecuentes">
          <Pregunta titulo="¿Por qué no veo el botón de crear o editar?">
            <p>Depende de tu rol en el espacio. Los revisores y lectores no editan. Un administrador puede cambiar tu rol en Miembros.</p>
          </Pregunta>
          <Pregunta titulo="¿Qué hora se usa en el calendario?">
            <p>La zona horaria del espacio (Ajustes del espacio). Todas las personas ven las mismas horas aunque estén en otro país.</p>
          </Pregunta>
          <Pregunta titulo="Moví una publicación y ahora sale «atrasada»">
            <p>Si la fecha prevista ya pasó y no está publicada, se marca atrasada. Cámbiala a una fecha futura o márcala publicada.</p>
          </Pregunta>
          <Pregunta titulo="¿Puedo deshacer un borrado?">
            <p>No. Por eso se pide confirmación. Si borras una campaña, sus publicaciones se conservan sin campaña; si borras un perfil, se borra su historial de auditoría.</p>
          </Pregunta>
          <Pregunta titulo="¿Cómo trabajo con varias marcas o clientes?">
            <p>Cada marca tiene su estrategia, perfiles y publicaciones. Para separar del todo a un cliente (con sus propios miembros), crea otro espacio desde el selector de espacios.</p>
          </Pregunta>
          <Pregunta titulo="Olvidé mi contraseña">
            <p>En la pantalla de entrada, «Olvidé mi contraseña». Recibirás un enlace para crear una nueva.</p>
          </Pregunta>
        </Tarjeta>
      </section>
    </div>
  )
}
