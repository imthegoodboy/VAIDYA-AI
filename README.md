# Vaidya AI

Ayurveda RAG chat with plant image detection, document uploads, Tavily verification, Clerk login, chat history, optional Redis cache, Chroma indexing, and a Next.js frontend.

This repo is local-first. Run the backend and `fronteend-1` directly on your machine.

## Run Locally

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
copy .env.example .env
.\.venv\Scripts\python -m app.ingest_cli --clear --url-limit 0
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 5500 --reload
```

Frontend:

```powershell
cd fronteend-1
copy .env.local.example .env.local
npm install
npm run dev
```

For backend tests, install the dev requirements once:

```powershell
cd backend
.\.venv\Scripts\python -m pip install -r requirements-dev.txt
.\.venv\Scripts\python -m pytest
```

Open the Next.js URL printed by `npm run dev`.

## Local Data

The default backend env uses SQLite at `backend/ragchat.db` so the app can run locally without a separate database service.

For production or a local Postgres service, set `DATABASE_URL` in `backend/.env`:

```env
DATABASE_URL=postgresql+psycopg://rag:rag@127.0.0.1:5432/ragchat
```

Redis is optional locally. Set `REDIS_URL=redis://127.0.0.1:6379/0` only when you are running Redis yourself.

## Auth

The frontend uses Clerk. Each backend request sends the Clerk bearer token, and the backend stores sessions with the Clerk user id.

Frontend env:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:5500
```

Backend env:

```env
CLERK_ISSUER=
CLERK_AUDIENCE=
CLERK_JWKS_URL=
```

`CLERK_JWKS_URL` can stay empty when `CLERK_ISSUER` is set.

## Chat

New chats get a useful name from the first message. Uploads can include plant images, medicine photos, PDFs, text files, and markdown files.

Chat history, messages, uploads, and memory are isolated by Clerk user and by chat session. Each message has a stable per-session position, and each chat has its own memory summary record so one conversation cannot bleed into another. See [docs/chat-session-memory.md](docs/chat-session-memory.md) for the full flow and verification checklist.

## RAG Index

The backend ingests three source groups:

```text
data/herb-database-main/.../herb.json  structured herb records
data/Linkss.txt                        optional URL text sources
books/*/*.pdf                          book PDFs with optional contain.md guide files
```

Book PDFs are chunked page-by-page with book title, page, section, and `contain.md` context. Rebuild the full local index after adding or changing books:

```powershell
cd backend
.\.venv\Scripts\python -m app.ingest_cli --clear
```

Use `--url-limit 0` only when you intentionally want to skip URL ingestion.

## Backend

FastAPI handles:

```text
Clerk auth
Session ownership
Chat orchestration
RAG retrieval
Plant vision
Prescription and document parsing
Upload jobs
Tavily verification
Chat history
Chroma indexing
SQLite FTS/BM25 lexical indexing for hybrid retrieval
```

 