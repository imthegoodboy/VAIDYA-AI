# Backend

FastAPI RAG backend for Vaidya AI.

It handles Clerk auth, user-owned chat sessions, Chroma retrieval, OpenAI chat and vision agents, plant image detection, prescription or document uploads, Tavily verification, chat history, and optional Redis query caching.

Chat data is separated by Clerk user and session. Messages are ordered with a per-session `position`, uploads are scoped to their session, and session memory is stored in the separate `chat_session_memory` table. See `../docs/chat-session-memory.md` before changing chat, memory, uploads, or history.

## Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
copy .env.example .env
```

For tests:

```powershell
.\.venv\Scripts\python -m pip install -r requirements-dev.txt
.\.venv\Scripts\python -m pytest
```

The default `.env.example` uses local SQLite:

```env
DATABASE_URL=sqlite:///./ragchat.db
CHROMA_PATH=../vector_store
LEXICAL_INDEX_PATH=../vector_store/rag_fts.sqlite3
OPENAI_API_KEY=
CLERK_ISSUER=
```

For production or a local Postgres service, set:

```env
DATABASE_URL=postgresql+psycopg://rag:rag@127.0.0.1:5432/ragchat
```

Redis is optional locally:

```env
REDIS_URL=redis://127.0.0.1:6379/0
```

## Run

```powershell
.\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 5500 --reload
```

If you use another port, update `NEXT_PUBLIC_API_BASE_URL` in `fronteend-1/.env.local`.

## Ingest

```powershell
.\.venv\Scripts\python -m app.ingest_cli --clear --url-limit 0
```

This indexes local herb data and local `../books/*/*.pdf` files. Each book folder can include a `contain.md` guide; it is stored as chunk context so retrieval knows what the book is best for.

Use this for the full URL list from `data/Linkss.txt`:

```powershell
.\.venv\Scripts\python -m app.ingest_cli --clear
```

## Routes

```text
GET  /health
POST /ingest/
GET  /sessions/
POST /sessions/
GET  /sessions/{id}/messages
GET  /sessions/{id}/uploads
GET  /sessions/{id}/uploads/{upload_id}/file
POST /sessions/{id}/uploads
POST /sessions/{id}/chat/
```
