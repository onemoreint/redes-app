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

## Entrega 1 — Cuentas, espacios, miembros y roles

| # | Prueba | Cómo | Estado | Fecha |
| --- | --- | --- | --- | --- |
| 1.1 | 30 pruebas SQL de acceso: un ajeno no ve ni toca nada; solo administradores invitan, cambian roles y borran; la invitación solo sirve al correo invitado, una vez y antes de vencer; el último administrador no puede salir ni bajarse de rol; zona horaria válida; funciones privadas cerradas al público | `supabase/tests/0001_acceso.sql` en el editor SQL | aprobado | 2026-10-25 |
| 1.2 | Avisos de seguridad de Supabase revisados; funciones internas movidas a esquema privado; índices de claves foráneas | Supabase advisors | aprobado | 2026-10-25 |
| 1.3 | Tipos, 22 pruebas de cálculos y compilación en GitHub Actions | push a `main` | aprobado | 2026-10-25 |
| 1.4 | Sin sesión: `/` y rutas internas llevan a "Entrar" y vuelven a la ruta pedida tras entrar | navegador, URL pública | aprobado | 2026-10-25 |
| 1.5 | Enlace de invitación sin sesión ofrece "Crear cuenta" / "Ya tengo cuenta" | navegador, URL pública | aprobado | 2026-10-25 |
| 1.6 | Pantallas de entrar y crear cuenta en móvil (375 px) y escritorio | navegador | aprobado | 2026-10-25 |
| 1.7 | Crear cuenta, confirmar correo y entrar | persona real | pendiente | |
| 1.8 | Crear primer espacio; recargar y que siga ahí | persona real | pendiente | |
| 1.9 | Invitar a otra cuenta por enlace, aceptar, ver el rol correcto | dos cuentas reales | pendiente | |
| 1.10 | Cambiar rol, quitar miembro, salir, borrar espacio con confirmación | dos cuentas reales | pendiente | |
| 1.11 | Recuperar contraseña por correo | persona real | pendiente | |

Nota: las direcciones internas (`/miembros`, `/invitacion/...`) se sirven desde `404.html`, que contiene la app (técnica estándar para apps de una página en GitHub Pages). El navegador registra un 404 en la consola, pero la página funciona.

Nota sobre pruebas con cuentas: Claude no crea cuentas ni escribe contraseñas en la app publicada; las pruebas 1.7 a 1.11 las hace una persona.

## Entrega 2 — Marcas y estrategia

| # | Prueba | Cómo | Estado | Fecha |
| --- | --- | --- | --- | --- |
| 2.1 | 18 pruebas SQL: la estrategia nace con la marca; autoría automática; nombre de marca único por espacio; solo administradores crean y borran marcas; editores editan estrategia y objetivos; revisores solo leen; un ajeno no ve nada ni puede colgar objetivos en marcas ajenas; una marca no cambia de espacio; metas negativas rechazadas; borrar la marca borra su estrategia y objetivos | `supabase/tests/0002_marcas.sql` | aprobado | 2026-10-25 |
| 2.2 | La plantilla 1 conserva todas sus preguntas (7 + 6 + 6 casillas + 5) y el avance se calcula bien | `npm test` (estrategia.test.ts) | aprobado | 2026-10-25 |
| 2.3 | Objetivos: vencido solo si está activo y pasó la fecha; cambio pedido en número y % | `npm test` | aprobado | 2026-10-25 |
| 2.4 | Números escritos a mano: "1.500", "1500,5", "1.500,25"; texto inválido da error | `npm test` (numeros.test.ts) | aprobado | 2026-10-25 |
| 2.5 | Avisos de seguridad de Supabase sin hallazgos nuevos | Supabase advisors | aprobado | 2026-10-25 |
| 2.6 | Crear marca, completar estrategia (se guarda sola), recargar y ver los datos | persona real | pendiente | |
| 2.7 | Crear, editar y eliminar objetivos; archivar, restaurar y borrar marca | persona real | pendiente | |
| 2.8 | Con rol Revisor: todo en solo lectura | persona real | pendiente | |

## Entrega 3 — Publicaciones y calendario editorial

| # | Prueba | Cómo | Estado | Fecha |
| --- | --- | --- | --- | --- |
| 3.1 | 22 pruebas SQL: espacio fijado por la marca; tipos sin repetidos; no se programa sin fecha; la pausa recuerda y limpia el estado anterior; el estado anterior no se edita desde el navegador; responsable debe ser miembro (y se conserva si luego sale); no se mueve a marca de otro espacio; canal único por publicación; enlace solo http(s); revisora solo lee; ajeno no ve ni inyecta; borrar marca borra publicaciones y canales | `supabase/tests/0003_publicaciones.sql` | aprobado | 2026-10-25 |
| 3.2 | Calendario: semanas de lunes a domingo, meses con semanas completas, años bisiestos | `npm test` (calendario.test.ts) | aprobado | 2026-10-25 |
| 3.3 | Zona horaria: 23:30 en Bogotá cae en su día; mover de día conserva la hora local aun con cambio de horario de verano (Nueva York) | `npm test` | aprobado | 2026-10-25 |
| 3.4 | Filtros por marca, red, estado, atrasadas, responsable, categoría y texto (la prueba detectó y se corrigió un error en "atrasadas") | `npm test` | aprobado | 2026-10-25 |
| 3.5 | Crear publicación desde el calendario y desde un día concreto; editar; recargar | persona real | pendiente | |
| 3.6 | Arrastrar una tarjeta a otro día y una idea al calendario | persona real (escritorio) | pendiente | |
| 3.7 | Vistas mes, semana, lista y agenda en el teléfono | persona real | pendiente | |
| 3.8 | Redes: marcar, adaptar texto, aviso de límite, enlace publicado | persona real | pendiente | |

Límites de caracteres por red (solo avisos): referencia Buffer, consultada el 2026-10-25 — X 280 (cuentas gratuitas), Instagram 2.200, Facebook 5.000, LinkedIn 3.000, TikTok 2.200, Threads 500 (cuenta bytes), Pinterest 500, YouTube 5.000.

## Entrega 4 — Revisión y aprobación

| # | Prueba | Cómo | Estado | Fecha |
| --- | --- | --- | --- | --- |
| 4.1 | 20 pruebas SQL: solo editores/administradores piden revisión y solo de ideas o borradores; administradores, editores y revisores aprueban o devuelven; devolver exige motivo; no se revisa lo que no está en revisión; el lector ve el historial pero no comenta ni aprueba; no se fabrican aprobaciones a mano; los comentarios no se editan, cada uno borra solo los suyos y el historial no se borra; comentarios vacíos rechazados; un ajeno no ve ni revisa ni comenta | `supabase/tests/0004_revision.sql` | aprobado | 2026-10-25 |
| 4.2 | Avisos de seguridad: solo las 5 funciones públicas previstas; protección de contraseñas filtradas desactivada (ajuste del panel de Supabase) | Supabase advisors | aprobado (con nota) | 2026-10-25 |
| 4.3 | Pedir revisión desde el editor; la bandeja muestra la pendiente y el contador del menú | dos cuentas reales | pendiente | |
| 4.4 | Revisor aprueba y devuelve con motivo; el editor la ve en "Devueltas" | dos cuentas reales | pendiente | |
| 4.5 | Comentar, borrar mi comentario, historial con autor y hora | persona real | pendiente | |
