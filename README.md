# ElectroFix — Proyecto final JC

Aplicación web para un emprendimiento de mantenimiento, diagnóstico y pedidos de repuestos electrónicos.

## Módulos del proyecto
- Sitio público con presentación del negocio y servicios.
- Catálogo de productos consultado desde MongoDB.
- Formulario de solicitudes con código de seguimiento.
- Panel administrativo con autenticación y gestión de solicitudes.
- Asistente ElectroFix AI opcional.
- Backend Node.js + Express y persistencia MongoDB.

## Tecnologías
Node.js, Express, MongoDB, Mongoose, HTML, CSS, JavaScript y React.

## Ejecutar localmente
1. Instalar Node.js 20 o superior y MongoDB (Atlas o local).
2. Entrar a `backend` y ejecutar `npm install`.
3. Copiar `.env.example` como `.env` y completar `MONGODB_URI` y `SESSION_SECRET`.
4. Ejecutar `npm run seed` para cargar productos de muestra.
5. Ejecutar `npm run create-admin` para crear el usuario administrador.
6. Ejecutar `npm run dev` y abrir `http://localhost:3000`.

## Documentación
Si quieren saber mas consulten `docs/` para arquitectura y configuración.

## Proyecto creado por:
-Amy Cruz.
-Cristhian Sanchez.

