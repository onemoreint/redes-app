# Checklist de pruebas

Estados: **aprobado** (se ejecutó y pasó), **fallido** (se ejecutó y falló), **pendiente** (aún no se ejecuta). Una prueba solo se marca aprobada si se ejecutó.

## Entrega 0 — Base

| # | Prueba | Cómo | Estado | Fecha |
| --- | --- | --- | --- | --- |
| 0.1 | Cálculos del informe contra los datos de ejemplo de la plantilla IC 8857 (alcance 10.000, compromiso promedio 625,8, top 5) | `npm test` | aprobado | 2026-10-25 |
| 0.2 | Conteos del tablero contra la plantilla de plan de publicación (por día, tipo y canal; promedio de caracteres 572,3) | `npm test` | aprobado | 2026-10-25 |
| 0.3 | Cambios de auditoría, atrasos, caracteres, límites y zona horaria | `npm test` | aprobado | 2026-10-25 |
| 0.4 | Comprobación de tipos y compilación | `npm run build` | aprobado | 2026-10-25 |
| 0.5 | Las pruebas se ejecutan automáticamente en GitHub Actions | push a `main` | aprobado | 2026-10-25 |
| 0.6 | La app carga en la URL pública y muestra "Conexión con la base de datos: correcta" | abrir la URL | aprobado | 2026-10-25 |
| 0.7 | Vista en móvil (390 px) y escritorio | navegador (375 px y escritorio) | aprobado | 2026-10-25 |

Nota 0.6: la consola muestra un 404 de `/favicon.ico` en la raíz del dominio (petición automática del navegador). No afecta a la app; el icono propio se sirve desde `/redes-app/favicon.svg`.
