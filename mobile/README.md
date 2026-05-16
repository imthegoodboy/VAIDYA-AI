# Vaidya AI Mobile

Capacitor Android client for AI Vaidya. This app keeps the current web frontend and FastAPI backend untouched.

## Shape

```text
fronteend-1/   existing Next.js web app
backend/       existing FastAPI backend
mobile/        Capacitor Android app
```

## Modes

- `Auto`: use the backend when reachable, otherwise fall back to offline mode.
- `Online`: force the same FastAPI backend used by the web app.
- `Offline`: answer from the bundled local Ayurveda starter pack without network access.

The offline engine is intentionally isolated in `src/lib/offline-rag.ts`. It currently uses deterministic retrieval plus source-grounded extractive answers, and it can call a future native `OfflineLlm` Capacitor plugin when a LiteRT-LM or llama.cpp Android model is added.

## Run

```powershell
cd mobile
npm install
copy .env.example .env
npm run dev
```

## Build Android

```powershell
cd mobile
npm run build
npx cap add android
npx cap sync android
npx cap open android
```

For online mode, set the API base URL in the app settings. The backend chat routes require a Clerk bearer token, so this first mobile build accepts a bearer token in settings. Replace that with native Clerk sign-in before public release.
