from __future__ import annotations

import hashlib
from threading import RLock
import uuid
from typing import Any

import chromadb
from chromadb.config import Settings as ChromaSettings

from app import lexical_store
from app.config import settings


COLLECTION_NAME = "rag_documents"

_lock = RLock()
_client: Any | None = None
_collection: Any | None = None


def stable_chunk_id(metadata: dict[str, Any], document: str = "") -> str:
    parts = [
        str(metadata.get("source_type") or ""),
        str(metadata.get("source") or ""),
        str(metadata.get("session_id") or ""),
        str(metadata.get("upload_id") or ""),
        str(metadata.get("book_title") or ""),
        str(metadata.get("herb_name") or ""),
        str(metadata.get("title") or ""),
        str(metadata.get("record_index") or ""),
        str(metadata.get("page_start") or ""),
        str(metadata.get("page_end") or ""),
        str(metadata.get("chunk_index") or ""),
    ]
    if not any(parts):
        return str(uuid.uuid4())
    # Include a short document hash only for weakly identified chunks.
    if not (metadata.get("source") and metadata.get("chunk_index") is not None):
        parts.append(hashlib.sha1(document.encode("utf-8", errors="ignore")).hexdigest()[:16])
    digest = hashlib.sha1("\x1f".join(parts).encode("utf-8", errors="ignore")).hexdigest()
    return digest


def get_client():
    global _client
    with _lock:
        if _client is None:
            settings.chroma_path.mkdir(parents=True, exist_ok=True)
            _client = chromadb.PersistentClient(
                path=str(settings.chroma_path),
                settings=ChromaSettings(anonymized_telemetry=False),
            )
        return _client


def get_collection():
    global _collection
    with _lock:
        if _collection is None:
            client = get_client()
            _collection = client.get_or_create_collection(
                name=COLLECTION_NAME,
                metadata={"hnsw:space": "cosine"},
            )
        return _collection


def upsert_chunks(
    documents: list[str],
    metadatas: list[dict[str, Any]],
    embeddings: list[list[float]],
) -> list[str]:
    if not documents:
        return []
    col = get_collection()
    all_ids: list[str] = []
    batch = max(1, settings.chromadb_upsert_batch_size)
    for start in range(0, len(documents), batch):
        end = start + batch
        chunk_docs = documents[start:end]
        chunk_meta = metadatas[start:end]
        chunk_emb = embeddings[start:end]
        ids = [
            str(meta.get("chunk_id") or stable_chunk_id(meta, doc))
            for meta, doc in zip(chunk_meta, chunk_docs, strict=False)
        ]
        col.upsert(
            ids=ids, documents=chunk_docs, metadatas=chunk_meta, embeddings=chunk_emb
        )
        lexical_store.upsert_chunks(ids, chunk_docs, chunk_meta)
        all_ids.extend(ids)
    return all_ids


def query_collection(
    query_embedding: list[float],
    n_results: int,
    where: dict[str, Any] | None = None,
) -> dict[str, Any]:
    col = get_collection()
    kwargs: dict[str, Any] = {
        "query_embeddings": [query_embedding],
        "n_results": n_results,
        "include": ["documents", "metadatas", "distances"],
    }
    if where:
        kwargs["where"] = where
    return col.query(**kwargs)


def clear_collection() -> None:
    global _collection
    client = get_client()
    try:
        client.delete_collection(COLLECTION_NAME)
    except Exception:
        pass
    with _lock:
        _collection = None
    lexical_store.clear_collection()
    get_collection()


def delete_by_session(session_id: str) -> None:
    col = get_collection()
    try:
        col.delete(where={"session_id": session_id})
    except Exception:
        pass
    lexical_store.delete_by_session(session_id)
