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

## Autenticación (Supabase > Authentication > URL Configuration)

- Site URL: `https://onemoreint.github.io/redes-app/`
- Redirect URLs: `https://onemoreint.github.io/redes-app/**`

Sin esto, los enlaces de confirmación y de recuperación de contraseña llevan a una dirección equivocada.
El correo que envía Supabase en el plan gratuito tiene un límite bajo de envíos por hora, pensado para pruebas.

## Invitaciones (cambio respecto a la Etapa 3)

La Etapa 3 preveía una función de servidor que enviara las invitaciones por correo. En la entrega 1 se
sustituyó por **enlaces de invitación**: el administrador crea la invitación (correo + rol) y comparte el
enlace por WhatsApp o correo desde su propio teléfono. Ventajas: no requiere proveedor de correo ni clave
secreta en el servidor. Seguridad: el enlace solo funciona con una sesión del correo invitado, una vez y
durante 7 días (lo comprueba `public.aceptar_invitacion` en la base de datos).

## Base de datos

Migraciones aplicadas, en orden:
1. `0001_espacios_miembros.sql`: perfiles, espacios, miembros, invitaciones, reglas de acceso.
2. `0002_endurecer_funciones.sql`: funciones de permisos al esquema `privado`, índices.
3. `0003_marcas_estrategia.sql`: marcas, estrategia (plantilla 1) y objetivos, con reglas de acceso por rol.
4. `0004_publicaciones.sql`: publicaciones y sus redes (plantillas 3, 4, 5 y 6 fusionadas).

Pruebas: ejecutar cada archivo de `supabase/tests/` en el editor SQL. Siempre termina con un error
"RESULTADO: N fallos" que deshace todo; N debe ser 0.
