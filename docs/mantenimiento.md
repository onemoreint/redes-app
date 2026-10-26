# Mantenimiento

## Lo que hay que saber del plan gratuito de Supabase

- **Se pausa tras 1 semana sin actividad.** Los datos no se pierden. Para reactivarlo: entra a https://supabase.com/dashboard → proyecto `redes-app` → **Restore project**. Tarda unos minutos.
- **No hace copias de seguridad automáticas.** Las copias son responsabilidad tuya (abajo, dos formas).
- Límites de referencia: 500 MB de base de datos, envío de correos de autenticación limitado por hora.
- Si la app se vuelve importante para tu trabajo, el plan Pro (USD 25 al mes al momento de escribir esto) no se pausa e incluye copias diarias. Revisa el precio actual en https://supabase.com/pricing.

## Copias de seguridad

### 1. Desde la app (recomendado, sin configurar nada)

**Ajustes del espacio → Copia de seguridad → Descargar copia (.json)**. Solo administradores.

- Incluye todo el contenido del espacio: marcas, estrategia, objetivos, campañas, publicaciones y sus redes, comentarios, métricas, perfiles, auditoría, historial de importaciones, miembros y sus nombres/correos.
- No incluye invitaciones pendientes (llevan enlaces de acceso y caducan) ni contraseñas.
- Hazla al menos una vez al mes y guárdala fuera del computador (por ejemplo, en tu Google Drive).
- Si tienes varios espacios, descarga una copia de cada uno.

### 2. Copia semanal automática de toda la base de datos (opcional)

El flujo `.github/workflows/copia-seguridad.yml` hace un volcado completo cada lunes, lo **cifra** y lo guarda 90 días como artefacto de GitHub Actions. Mientras no configures los secretos, se omite sin fallar.

Configurarlo (una sola vez):

1. En Supabase: **Project Settings → Database → Connection string → Session pooler**. Copia la cadena (`postgresql://postgres.ybatnimglmstcsaotntn:[TU-CONTRASEÑA]@aws-...pooler.supabase.com:5432/postgres`) y pon la contraseña de la base de datos (si no la recuerdas, se cambia en esa misma página). Usa "Session pooler": la conexión directa no funciona desde GitHub.
2. En GitHub: **repositorio → Settings → Secrets and variables → Actions → New repository secret**:
   - `SUPABASE_DB_URL` = la cadena del paso 1.
   - `BACKUP_PASSPHRASE` = una frase larga que guardarás en un lugar seguro. **Sin ella la copia no se puede abrir.**
3. Pruébalo: pestaña **Actions → Copia de seguridad → Run workflow**. Al terminar, el archivo aparece en el resumen de la ejecución ("copia-cifrada").

El repositorio es público: por eso la copia siempre se cifra. Nunca pongas la cadena de conexión en un archivo del repositorio.

Abrir una copia:

```bash
gpg --decrypt copia-AAAA-MM-DD.tar.gz.gpg > copia.tar.gz   # pide la frase
tar -xzf copia.tar.gz                                     # deja copia/app-*.dump y copia/usuarios-*.dump
```

## Restaurar

**Haz siempre una copia del estado actual antes de restaurar.** Restaurar requiere conocimientos técnicos; si tienes dudas, pide ayuda.

### Desde la copia semanal (base de datos completa)

En un proyecto Supabase nuevo y vacío (o tras confirmar que quieres reemplazar los datos), con PostgreSQL 17:

```bash
# 1. Cuentas de usuario primero (perfiles y miembros dependen de ellas)
pg_restore --data-only --disable-triggers -d "$NUEVA_DB_URL" copia/usuarios-AAAA-MM-DD.dump
# 2. Estructura y datos de la app
pg_restore --no-owner --no-privileges --clean --if-exists -d "$NUEVA_DB_URL" copia/app-AAAA-MM-DD.dump
```

Si es un proyecto nuevo, actualiza `.env.production` con su URL y clave publicable, y repite la configuración de autenticación de `docs/despliegue.md`.

### Desde la copia .json de la app

El archivo es legible (JSON) y conserva los identificadores. Para volver a cargarlo, cada lista (`marcas`, `publicaciones`…) se inserta en su tabla en este orden: `marcas`, `estrategias` (actualizar la que se crea con la marca), `objetivos`, `campanas`, `publicaciones`, `publicacion_canales`, `comentarios`, `metricas`, `cuentas_red`, `registros_auditoria`. Los miembros deben tener cuenta antes. No hay botón de restaurar en la app a propósito: una restauración mal hecha puede duplicar datos.

Para recuperar unas pocas publicaciones, es más sencillo abrir el .json, copiar los datos y crearlas de nuevo, o convertirlas a una hoja y usar **Importar**.

## Actualizar dependencias

Cada pocos meses:

```bash
npm outdated
npm update
npm audit --omit=dev
npm test && npm run build
```

Sube los cambios a `main`: el flujo de despliegue vuelve a ejecutar las pruebas antes de publicar.

## Cambiar la base de datos

Nunca modifiques una migración ya aplicada. Añade `supabase/migrations/00NN_descripcion.sql`, aplícala en el editor SQL de Supabase (o con la CLI), actualiza `src/lib/datos/tipos-bd.ts` y añade pruebas en `supabase/tests/`.

## Seguridad

- Revisa de vez en cuando **Supabase → Advisors → Security**. Hoy solo aparecen las funciones públicas previstas (`crear_espacio`, `ver_invitacion`, `aceptar_invitacion`, `solicitar_revision`, `revisar_publicacion`) y la protección contra contraseñas filtradas.
- Opcional: activa **Authentication → Providers → Email → Prevent use of leaked passwords**, si tu plan lo permite.
- La clave de servicio (`service_role`) nunca va en el repositorio ni en la app.
