# Instalación desde cero

Esta guía es para levantar **otra copia** de la app (por ejemplo, para otra persona o para empezar de nuevo). La copia en uso ya está instalada: https://onemoreint.github.io/redes-app/

Tiempo aproximado: 30 minutos. Necesitas una cuenta de GitHub y una de Supabase (ambas gratuitas).

## 1. Repositorio

1. Crea un repositorio en GitHub (por ejemplo `redes-app`) y sube este código a la rama `main`.
2. Si el repositorio no se llama `redes-app`, cambia `base: '/redes-app/'` en `vite.config.ts` por `'/<nombre>/'`.

## 2. Base de datos (Supabase)

1. https://supabase.com/dashboard → **New project**. Elige la región más cercana (São Paulo para Colombia y Venezuela) y guarda la contraseña de la base de datos.
2. **SQL Editor**: ejecuta, en orden, cada archivo de `supabase/migrations/` (de `0001` a `0009`).
3. Opcional pero recomendable: ejecuta cada archivo de `supabase/tests/`. Cada uno termina con el error `RESULTADO: 0 fallos` y deshace sus cambios; si dice otro número, algo quedó mal.
4. **Authentication → URL Configuration**:
   - Site URL: `https://<tu-usuario>.github.io/<repositorio>/`
   - Redirect URLs: `https://<tu-usuario>.github.io/<repositorio>/**` (y `http://localhost:5173/<repositorio>/**` si vas a desarrollar)
5. **Project Settings → API**: copia la *Project URL* y la clave **publishable** (empieza por `sb_publishable_`). No uses la clave secreta.

## 3. Configuración de la app

Edita `.env.production`:

```
VITE_SUPABASE_URL=https://<id-del-proyecto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Estos valores son públicos: los datos los protegen las reglas de acceso de la base de datos.

## 4. Publicación (GitHub Pages)

1. Repositorio → **Settings → Pages → Source: GitHub Actions**.
2. Haz `push` a `main`. En **Actions** verás "Pruebas y despliegue"; al terminar en verde, la app está en `https://<tu-usuario>.github.io/<repositorio>/`.

## 5. Primer uso

1. Abre la app → **Crear cuenta** → confirma el correo.
2. Crea tu espacio de trabajo. Quedas como administrador.
3. Sigue **Primeros pasos** en Inicio, o crea la marca de ejemplo para ver cómo funciona.

## 6. Después

- Copias de seguridad y qué hacer si Supabase pausa el proyecto: `docs/mantenimiento.md`.
- Detalles de despliegue y de la base de datos: `docs/despliegue.md`.

## Desarrollo local

Requisitos: Node.js 22 o superior.

```bash
npm install
cp .env.example .env.local   # pon la URL y la clave publicable
npm run dev                  # http://localhost:5173/redes-app/
npm test                     # pruebas de cálculos e importación
npm run typecheck && npm run lint
```
