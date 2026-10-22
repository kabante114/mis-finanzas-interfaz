# Mis Finanzas: interfaz

Interfaz pública sin datos personales. El histórico financiero, saldos, cartera y contraseñas
no forman parte de este repositorio. No habilitar ejemplos con datos reales ni publicar exports.

## Estado

Login y almacenamiento conectados a Supabase. Altas públicas y accesos anónimos desactivados;
la base de datos admite únicamente al propietario invitado. No hay usuario ni contraseña demo.
El propietario debe aceptar su invitación y establecer la contraseña personalmente.
La versión anterior continúa disponible por separado; esta publicación no migra sus datos.

`config.js` admite únicamente URL del proyecto y una clave **publishable**, que es pública por
diseño. Jamás añadir una clave `service_role`, `sb_secret_`, contraseña o token de gestión.
El backend debe denegar anónimos y cuentas no autorizadas con controles de acceso en la base
de datos; ocultar la interfaz no sustituye esos controles.

## Continuación

1. El propietario acepta la invitación y define su contraseña; nunca se almacena en Git.
2. Verificar login y recuperación reales. SQL ya ha pasado pruebas sintéticas de autorización,
   validación y conflictos secuenciales; no equivalen a una prueba real entre dispositivos.
3. Importar el estado actual por un canal privado y verificarlo antes de cambiar accesos.
4. Confirmar la misma revisión y datos desde móvil y ordenador.

No se garantiza disponibilidad absoluta ni arranque offline. El plan gratuito del proveedor
puede pausarse por inactividad; no se contrata ningún plan de pago automáticamente.

Dependencias vendorizadas con sus licencias en `vendor/`. No se utilizan herramientas de
analítica ni se envían movimientos a GitHub. Los datos solo se solicitan después del login.
