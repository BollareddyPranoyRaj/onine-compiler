# Deployment

This project is set up for:

- `Vercel` for the frontend
- `Render` for the backend

## Frontend on Vercel

Create a Vercel project from:

`aio-compiler/frontend`

Set this environment variable in Vercel:

```bash
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

Build settings:

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`

## Backend on Render

This repo includes a Render Blueprint at:

[`render.yaml`](/Users/bollareddypranoyraj/java-compiler-2/render.yaml)

Or create the service manually with:

- Runtime: `Docker`
- Root Directory: `aio-compiler`
- Dockerfile Path: `./aio-compiler/Dockerfile.backend`
- Docker Build Context: `./aio-compiler`
- Health Check Path: `/health`

Set these environment variables in Render:

```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5-mini
CORS_ALLOWED_ORIGINS=https://your-vercel-app.vercel.app
HOST=0.0.0.0
PORT=5000
```

If you add a custom frontend domain later, include it in `CORS_ALLOWED_ORIGINS` as a comma-separated list.

## Notes

- Local Vite proxy is only for development.
- Production frontend calls the backend using `VITE_API_BASE_URL`.
- The backend health endpoint is available at `/health`.
