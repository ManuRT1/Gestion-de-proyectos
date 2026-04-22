
    Hasheo de Contraseñas: Uso de la librería bcrypt para el cifrado de credenciales en la base de datos, garantizando que las contraseñas nunca se almacenen en texto plano.

    Protección contra Fuerza Bruta: Implementación de un contador de intentos fallidos que bloquea las solicitudes de inicio de sesión tras 3 errores consecutivos


    Cookies HttpOnly: Los tokens se almacenan en cookies con los flags HttpOnly y SameSite: Lax, protegiendo la sesión contra ataques de Cross-Site Scripting (XSS) y CSRF.

    Control de Acceso Basado en Roles: Admin: Permisos totales sobre el CRUD y registro de usuarios.

                                         Invitado: Acceso restringido únicamente a la visualización de proyectos.
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    Modo Oscuro Personalizable: Opción de alternar el tema visual para reducir la fatiga visual, con persistencia de preferencia.