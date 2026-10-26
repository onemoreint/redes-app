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

## Entrega 5 — Panel principal

| # | Prueba | Cómo | Estado | Fecha |
| --- | --- | --- | --- | --- |
| 5.1 | El tablero mensual reproduce con fechas reales los conteos del Excel (semanas de 16, 20, 20 y 20; por día y por formato) e ignora lo que está fuera del mes | `npm test` (tablero.test.ts) | aprobado | 2026-10-25 |
| 5.2 | Cumplimiento del calendario = publicadas ÷ debidas, sin descartadas ni futuras; sin datos no inventa porcentaje | `npm test` | aprobado | 2026-10-25 |
| 5.3 | Panel con datos reales: próximas, atrasadas, pendientes, en proceso, tablero por mes y marca | persona real | pendiente | |

Definición de "cumplimiento": de las publicaciones cuya fecha prevista ya pasó (sin contar descartadas), qué porcentaje está en estado Publicado. Es un indicador nuevo; las plantillas no lo calculaban.

## Entrega 6 — Métricas e informes

| # | Prueba | Cómo | Estado | Fecha |
| --- | --- | --- | --- | --- |
| 6.1 | 11 pruebas SQL: la métrica hereda espacio y publicación de su red; origen siempre "manual"; una medición por red y día (se puede volver a medir otro día); sin negativos ni mediciones vacías; no se registra en redes de otro espacio; la revisora ve pero no cambia; un ajeno no ve; quitar la red borra sus métricas | `supabase/tests/0005_metricas.sql` | aprobado | 2026-10-25 |
| 6.2 | Informe con los datos de la plantilla IC 8857 y fórmulas corregidas: alcance total 10.000, compromiso 6.258, promedio 625,8, tasa 62,58 %, totales por métrica, comparación con la semana anterior, semana típica (30 días ÷ 30 × 7), top 5 y resumen por red | `npm test` (informe.test.ts) | aprobado | 2026-10-25 |
| 6.3 | Casos límite: periodo sin datos, variación sin base, última medición | `npm test` | aprobado | 2026-10-25 |
| 6.4 | CSV para Excel en español: coma decimal, comillas, saltos de línea, BOM y neutralización de fórmulas | `npm test` (csv.test.ts) | aprobado | 2026-10-25 |
| 6.5 | Registrar, editar y eliminar resultados en una publicación | persona real | pendiente | |
| 6.6 | Informe por periodo, marca y red; descarga CSV y abrirla en Excel | persona real | pendiente | |

Reglas del informe: cuenta cada publicación en cada red; la fecha es la de publicación real en esa red (si no se anotó, la prevista); la cifra es la medición más reciente.

## Entregas 7 y 8 — Perfiles y auditoría · Campañas

| # | Prueba | Cómo | Estado | Fecha |
| --- | --- | --- | --- | --- |
| 7.1 | 22 pruebas SQL (perfiles, auditoría, campañas, importaciones): herencia de espacio; red limpia de espacios; perfil único por red; enlace http(s); un registro por perfil y fecha; sin negativos; nada en otro espacio; campaña con fin ≥ inicio; publicación solo en campaña de su marca (ni de otra marca ni de otro espacio); borrar campaña conserva publicaciones; el registro de importación guarda quién la hizo y no se modifica; revisora solo lee; ajeno no ve; borrar perfil borra su historial | `supabase/tests/0006_auditoria_campanas_importaciones.sql` | aprobado | 2026-10-25 |
| 7.2 | Columnas calculadas de la auditoría con historial: seguidores y clics vs. mes, tráfico vs. mes y año, alcance vs. semana; sin historial no inventa cambios | `npm test` (auditoria.test.ts) | aprobado | 2026-10-25 |
| 8.1 | Filtro por campaña en el calendario (una campaña / sin campaña) | `npm test` (calendario.test.ts) | aprobado | 2026-10-25 |
| 7.3 | Añadir perfiles, registrar fotos, ver historial y cambios, CSV | persona real | pendiente | |
| 8.2 | Crear campaña, crear publicación dentro, ver avance y resultados, borrar campaña | persona real | pendiente | |

Regla de la auditoría: "el mes pasado" es el registro más reciente con fecha de al menos 30 días antes del actual (semana: 7 días; año: 365).

## Entrega 9 — Importar y exportar (Excel / CSV)

| # | Prueba | Cómo | Estado | Fecha |
| --- | --- | --- | --- | --- |
| 9.1 | Lectura de CSV (`;` `,` tabulador, comillas, saltos de línea, BOM) y de .xlsx (texto enriquecido, fórmulas con su último resultado, enlaces, hojas ocultas fuera) | `npm test` (importar.test.ts, excel.test.ts) | aprobado | 2026-10-26 |
| 9.2 | Detección de la fila de encabezados y correspondencia de columnas con los nombres de las plantillas, incluida la traducción automática (CORREO = post, GORJEO = X, Vinculado = LinkedIn, ALCANZAR = alcance); no confunde columnas "del mes pasado" | `npm test` | aprobado | 2026-10-26 |
| 9.3 | Estructuras reales: Plan de contenido (bloques por red, encabezados repetidos por mes), Multicanal (red en una columna, "Asignado a" a notas), Tablero (formatos TEXTO/IMAGEN/VIDEO, semana y día a notas); las listas de valores de ejemplo no se importan como publicaciones | `npm test` y lectura local de las 7 plantillas originales (no se suben al repositorio) | aprobado | 2026-10-26 |
| 9.4 | Conversión de fechas (día/mes/año, año-mes-día, número de serie de Excel; fechas imposibles rechazadas), horas, estados en español traducido e inglés, etapas y marcas de red | `npm test` | aprobado | 2026-10-26 |
| 9.5 | Validación por fila con motivo; posibles duplicados (mismo título y día, o misma red/perfil/fecha en auditoría) marcados y no importados salvo que se pida; nunca se sobrescribe | `npm test` | aprobado | 2026-10-26 |
| 9.6 | Exportar a .xlsx y volver a leerlo igual; textos que empiezan por = + - @ neutralizados | `npm test` (excel.test.ts) | aprobado | 2026-10-26 |
| 9.7 | ExcelJS se carga solo al importar o exportar (bloque aparte en la compilación) | `npm run build` | aprobado | 2026-10-26 |
| 9.8 | Importar cada plantilla propia (con datos) a una marca: vista previa, rechazos con motivo, resultado en el calendario / auditoría, historial de importaciones | persona real | pendiente | |
| 9.9 | Descargar Excel del calendario, informes y auditoría y abrirlos en Excel | persona real | pendiente | |
| 9.10 | Copia de seguridad (.json) del espacio desde Ajustes (solo administradores) | persona real | pendiente | |

Reglas de importación:

- Estados de las plantillas:
  - "al corriente" / Posted → Publicado
  - "en espera" / On hold → En pausa
  - "animado" / Nixed → Descartado
  - "en curso", "atrasado", "actualización de necesidades" → Borrador
  - "necesita revisión" → En revisión
  - "no comenzó" → Idea
- Sin estado: Borrador si tiene fecha, Idea si no.
- "Programado" sin fecha → Aprobado, con aviso.
- Una fila sin título, fecha, texto, hashtags, CTA, notas ni redes marcadas se ignora.
- Sin título pero con texto: el título es el comienzo del texto, con aviso.
- La plantilla de informe (IC 8857) y la de plan estratégico son resúmenes: sus datos se registran en Informes / Marcas → Estrategia, no se importan.
