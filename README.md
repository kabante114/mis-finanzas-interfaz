# Mis Finanzas: interfaz

Interfaz pública sin datos personales. El histórico financiero, saldos, cartera y contraseñas
no forman parte de este repositorio. No habilitar ejemplos con datos reales ni publicar exports.

## Estado

Login y almacenamiento preparados para Supabase. Hasta configurar el proyecto, la pantalla
indica que el acceso está pendiente y bloquea la aplicación. No hay usuario ni contraseña demo.
La versión anterior continúa disponible por separado; esta publicación no migra sus datos.

`config.js` admite únicamente URL del proyecto y una clave **publishable**, que es pública por
diseño. Jamás añadir una clave `service_role`, `sb_secret_`, contraseña o token de gestión.
El backend debe denegar anónimos y cuentas no autorizadas con controles de acceso en la base
de datos; ocultar la interfaz no sustituye esos controles.

## Continuación

1. El propietario completa el alta y acceso en Supabase.
2. Configurar SQL, usuario permitido y correo/contraseña en el proveedor; no en Git.
3. Probar denegación a anónimos y otra cuenta, conflictos de escritura y recuperación de acceso.
4. Importar el estado actual por un canal privado y verificarlo antes de cambiar accesos.
5. Configurar los dos valores públicos de `config.js` y publicar una revisión nueva.

No se garantiza disponibilidad absoluta ni arranque offline. El plan gratuito del proveedor
puede pausarse por inactividad; no se contrata ningún plan de pago automáticamente.

Dependencias vendorizadas con sus licencias en `vendor/`. No se utilizan herramientas de
analítica ni se envían movimientos a GitHub. Los datos solo se solicitan después del login.
