# redes-app

Aplicación web para gestionar redes sociales: estrategia, calendario editorial, publicaciones, revisión, campañas, métricas, informes y auditoría de perfiles. Sustituye a 7 plantillas de Excel, que se pueden importar. Uso personal, multiusuario con roles.

- **App publicada:** https://onemoreint.github.io/redes-app/
- **Especificación, auditoría y plan:** documento "Auditoría de plantillas Excel — App de gestión de redes sociales" (3 pestañas: auditoría, especificación funcional, arquitectura y plan).

## Qué hace

| Módulo | Sustituye a | Qué hace |
| --- | --- | --- |
| Marcas → Estrategia y objetivos | Plan estratégico | Preguntas de la plantilla, objetivos con meta y fecha, avance |
| Calendario y publicaciones | Horario, Plan de contenido, Multicanal, Plan con tablero | Mes, semana y lista; arrastrar para cambiar fecha; texto por red; límite de caracteres; filtros |
| Revisión | — | Enviar a revisión, aprobar o devolver con comentario |
| Campañas | Multicanal (tema del mes) | Agrupar publicaciones con fechas, etapa y resultados |
| Inicio | Tablero de la plantilla de publicación | Próximas, atrasadas, pendientes, cumplimiento, tablero mensual |
| Informes | Informe de redes (IC 8857) | Resultados por periodo, comparación, semana típica, top 5, por red |
| Perfiles y auditoría | Auditoría de redes | Foto periódica por perfil con cambios vs. semana, mes y año |
| Importar | — | Trae las plantillas de Excel/CSV con vista previa; nunca sobrescribe |
| Exportar | — | Excel o CSV de calendario, informes y auditoría; copia .json del espacio |

No se conecta con las redes sociales: no publica ni lee estadísticas. Cómo se calcula cada cifra: página **Ayuda** de la app.

## Tecnología

| Parte | Herramienta |
| --- | --- |
| Interfaz | React 19, TypeScript, Vite, Tailwind CSS |
| Datos e inicio de sesión | Supabase (PostgreSQL con reglas de acceso por fila) — proyecto `redes-app`, región São Paulo |
| Publicación | GitHub Pages, desplegado por GitHub Actions en cada cambio a `main` |
| Pruebas | Vitest (cálculos, importación, Excel) y pruebas SQL de permisos (`supabase/tests/`) |
| Excel | ExcelJS, cargado solo al importar o exportar |

## Desarrollar en tu computadora

Requisitos: Node.js 22 o superior.

```bash
npm install
cp .env.example .env.local   # y pon la URL y la clave publicable de Supabase
npm run dev                  # abre http://localhost:5173/redes-app/
npm test                     # ejecuta las pruebas
npm run build                # compila a dist/
```

## Variables de entorno

| Variable | Qué es | ¿Secreta? |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Dirección del proyecto Supabase | No |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave publicable (va en el navegador) | No; las reglas de acceso protegen los datos |

Los valores de producción están en `.env.production`. La clave de servicio de Supabase **nunca** se guarda en este repositorio.

## Estructura

```
src/app/            rutas y estructura (desde la entrega 1)
src/modules/        un módulo por carpeta (desde la entrega 1)
src/lib/calculos/   fórmulas migradas de Excel, sin interfaz, con pruebas
src/lib/datos/      cliente de Supabase
supabase/migrations tablas y reglas de acceso
tests/fixtures/     datos de ejemplo extraídos de las plantillas originales
docs/               instalación, despliegue, mantenimiento y checklist de pruebas
```

## Documentación

- `docs/instalacion.md`: levantar otra copia desde cero.
- `docs/despliegue.md`: GitHub Pages, Supabase, autenticación, migraciones.
- `docs/mantenimiento.md`: copias de seguridad, restaurar, pausa del plan gratuito, actualizaciones.
- `docs/checklist-pruebas.md`: qué se probó, cómo y qué queda por probar con una persona real.

## Autor

José Lugo · +57 312 638 7467 · jose.lugocdv@gmail.com

## Despliegue

Cada `push` a `main` ejecuta tipos, pruebas y compilación; si todo pasa, publica en GitHub Pages. Ver `docs/despliegue.md`.
