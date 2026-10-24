# Arquitectura de ElectroFix

## Flujo de datos

1. El navegador envía JSON a la API Express.
2. Express valida los campos y aplica límites de solicitudes.
3. Mongoose interactúa con MongoDB.
4. MongoDB almacena documentos en las colecciones `products`, `servicerequests`, `users` y `sessions`.
5. Las rutas administrativas exigen una sesión válida.

## Modelos

- `Product`: catálogo, precio, categoría, descripción y estado de publicación.
- `ServiceRequest`: cliente, contacto, equipo, servicio, descripción, código y estado.
- `User`: cuenta administrativa y hash de contraseña.
- `sessions`: sesiones gestionadas por `connect-mongo`.

## Decisiones de seguridad incluidas

- No se conecta MongoDB desde el navegador.
- Credenciales y secretos solo en variables de entorno.
- Hash de contraseñas con bcrypt.
- Regeneración de sesión al iniciar sesión.
- Cookies `httpOnly` y `sameSite`; `secure` en producción con HTTPS.
- Rutas de lectura y actualización de solicitudes protegidas.
- Límite de intentos de inicio de sesión y límite general de API.
- Validación y límites de longitud de campos.

Para un despliegue real deben añadirse revisión de privacidad, política CSRF acorde al dominio y despliegue, registros de auditoría, copias de seguridad y monitoreo.
