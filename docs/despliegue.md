# Despliegue

## GitHub Pages (una sola vez)

1. En el repositorio: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Haz `push` a `main`. El flujo "Pruebas y despliegue" compila y publica.
3. La app queda en https://onemoreint.github.io/redes-app/

Si el flujo falla en el paso de pruebas, no se publica nada: la versión anterior sigue en línea.

## Supabase

- Proyecto: `redes-app` (id `ybatnimglmstcsaotntn`), región `sa-east-1`, plan gratuito.
- El plan gratuito **pausa el proyecto tras 1 semana sin actividad**. Se reactiva desde el panel de Supabase.
- El plan gratuito **no hace copias de seguridad automáticas**. La copia propia se configura en la entrega 10 (ver `docs/mantenimiento.md`).
- La estructura de la base de datos vive en `supabase/migrations/`, en orden. Nunca se modifica una migración ya aplicada: se añade una nueva.
