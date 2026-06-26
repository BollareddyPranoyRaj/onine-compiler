# Deployment

This project is set up for:

- `Vercel (https://bprcodelab.dev)` for the frontend
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
CORS_ALLOWED_ORIGINS=https://bprcodelab.dev,https://www.bprcodelab.dev
HOST=0.0.0.0
PORT=5000
```

CORS_ALLOWED_ORIGINS already includes the production custom domains. Add any additional frontend domains as a comma-separated list if needed.

## Notes

- Local Vite proxy is only for development.
- Production frontend calls the backend using `VITE_API_BASE_URL`.
- The backend health endpoint is available at `/health`.
