# redes-app

Aplicación web para gestionar redes sociales: estrategia, calendario editorial, publicaciones, revisión, métricas e informes. Sustituye a 7 plantillas de Excel. Uso personal.

- **App publicada:** https://onemoreint.github.io/redes-app/
- **Especificación, auditoría y plan:** documento "Auditoría de plantillas Excel — App de gestión de redes sociales" (3 pestañas: auditoría, especificación funcional, arquitectura y plan).

## Tecnología

| Parte | Herramienta |
| --- | --- |
| Interfaz | React 19, TypeScript, Vite, Tailwind CSS |
| Datos e inicio de sesión | Supabase (PostgreSQL con reglas de acceso por fila) — proyecto `redes-app`, región São Paulo |
| Publicación | GitHub Pages, desplegado por GitHub Actions en cada cambio a `main` |
| Pruebas | Vitest (cálculos) |

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
docs/               despliegue, mantenimiento y checklist de pruebas
```

## Despliegue

Cada `push` a `main` ejecuta tipos, pruebas y compilación; si todo pasa, publica en GitHub Pages. Ver `docs/despliegue.md`.
