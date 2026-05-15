import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import chat, health, ingest, sessions, unsplash_intent, prakriti

logging.basicConfig(level=logging.INFO)


def _cors_origins() -> list[str]:
    origins = [origin.strip() for origin in settings.cors_origins.split(",")]
    return [origin for origin in origins if origin]


def _warm_chat_dependencies() -> None:
    try:
        from app import chroma_store, lexical_store
        from app.embeddings import warm_embedding_model

        chroma_store.get_collection().count()
        lexical_store.count_rows()
        warm_embedding_model()
        logging.info("Chat dependencies warmed")
    except Exception as e:
        logging.info("Chat dependency warmup skipped: %s", e)


async def _warm_chat_dependencies_later() -> None:
    await asyncio.sleep(2)
    await asyncio.to_thread(_warm_chat_dependencies)


@asynccontextmanager
async def lifespan(_: FastAPI):
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    try:
        from app.db.session import init_db

        init_db()
    except Exception as e:
        logging.warning("Database init skipped or failed: %s", e)
    asyncio.create_task(_warm_chat_dependencies_later())
    yield


app = FastAPI(title="Multilingual RAG API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(chat.router)
app.include_router(ingest.router)
app.include_router(sessions.router)
app.include_router(unsplash_intent.router)
app.include_router(prakriti.router)


@app.get("/")
def root():
    return {"service": "multilingual-rag", "docs": "/docs"}
