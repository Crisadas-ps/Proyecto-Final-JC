# ElectroFix migrado a React

## Ejecutar en desarrollo
1. Terminal A: `cd backend` -> `npm install` -> crear `backend/.env` a partir de `.env.example` -> `npm start`.
2. Terminal B: `cd frontend` -> `npm install` -> `npm run dev`.
3. Abrir la URL de Vite (normalmente http://localhost:5173).

Vite redirige `/api` al backend local en `http://localhost:3000`.

## Producción / servidor local con Express
1. En `frontend`: `npm install` y `npm run build`.
2. En `backend`: `npm start`. El servidor sirve ahora `frontend/dist`.
3. Abrir `http://localhost:3000`.

Para la IA, configura OPENAI_API_KEY en backend/.env (opcional). No publiques el `.env` ni claves.
GitHub Pages solo sirve archivos estáticos: no ejecuta Express/MongoDB. Para el sitio publicado con funciones dinámicas, backend debe desplegarse en un host compatible y `VITE_API_BASE` debe apuntar a su URL pública; además, la API debe habilitar CORS y cookies de sesión correctamente.
