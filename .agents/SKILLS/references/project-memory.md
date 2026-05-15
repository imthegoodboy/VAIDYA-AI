# Project Memory

Use this file for durable AI Vaidya project knowledge that future agents should reuse. Do not use it as a task log.

## Current Durable Lessons

- The active frontend folder is `fronteend-1/`.
- The backend is `backend/` and exposes the FastAPI app at `app.main:app`.
- The app is a source-grounded Ayurveda assistant. Retrieval context and uploaded documents should drive answers, not invented medical claims.
- Local runtime artifacts such as logs, uploaded files, SQLite databases, caches, vector stores, and `.env` files should stay out of feature changes and PRs.
- Keep the repo local-first: backend and frontend should run directly on the machine, with no container-based development path.
- Backend local dev defaults to SQLite at `sqlite:///./ragchat.db`; use Postgres only when a real deployed or local database service is intentionally configured.
- Backend tests require `backend/requirements-dev.txt`; run `python -m pytest` from `backend/` after installing it.
- Frontend release checks are `npm run lint`, `npx tsc --noEmit`, and `npm run build` from `fronteend-1/`.

## Add New Lessons Here

Add a short bullet only when a task reveals reusable knowledge, such as:

- A stable command future agents should run.
- A real architecture boundary that should not be crossed.
- A common bug pattern and the preferred fix.
- A product invariant that must be preserved.
- A verification step that caught a meaningful issue.
