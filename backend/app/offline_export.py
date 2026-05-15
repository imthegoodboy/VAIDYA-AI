from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path
from typing import Any

from app import chroma_store


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _safe_source(meta: dict[str, Any]) -> str:
    source = str(meta.get("source") or "")
    if source.startswith(("http://", "https://")):
        return source
    if meta.get("source_type") == "upload":
        return source
    file_name = str(meta.get("file_name") or "")
    if file_name:
        return file_name
    return source.replace("\\", "/").rstrip("/").split("/")[-1] or "indexed source"


def export_offline_pack(output_path: Path) -> dict[str, Any]:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists():
        output_path.unlink()

    col = chroma_store.get_collection()
    total = col.count()
    res = col.get(
        include=["documents", "metadatas", "embeddings"],
        limit=total,
    )
    ids = res.get("ids") or []
    documents = res.get("documents") or []
    metadatas = res.get("metadatas") or []
    raw_embeddings = res.get("embeddings")
    embeddings = raw_embeddings.tolist() if hasattr(raw_embeddings, "tolist") else (raw_embeddings or [])

    conn = sqlite3.connect(output_path)
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute(
            """
            CREATE TABLE manifest (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE chunks (
                id TEXT PRIMARY KEY,
                text TEXT NOT NULL,
                source TEXT NOT NULL,
                source_type TEXT,
                title TEXT,
                book_title TEXT,
                section_title TEXT,
                page_start TEXT,
                page_end TEXT,
                metadata_json TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE VIRTUAL TABLE chunks_fts USING fts5(
                id UNINDEXED,
                text,
                title,
                book_title,
                section_title,
                tokenize = 'unicode61 remove_diacritics 2'
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE embeddings (
                chunk_id TEXT PRIMARY KEY REFERENCES chunks(id) ON DELETE CASCADE,
                vector_json TEXT NOT NULL
            )
            """
        )
        rows = []
        fts_rows = []
        vector_rows = []
        for chunk_id, text, meta, vector in zip(ids, documents, metadatas, embeddings, strict=False):
            meta = dict(meta or {})
            source_type = str(meta.get("source_type") or "")
            if source_type == "upload":
                continue
            source = _safe_source(meta)
            title = str(
                meta.get("book_title")
                or meta.get("herb_name")
                or meta.get("title")
                or source
            )
            rows.append(
                (
                    str(chunk_id),
                    str(text or ""),
                    source,
                    source_type,
                    title,
                    meta.get("book_title"),
                    meta.get("section_title"),
                    str(meta.get("page_start") or ""),
                    str(meta.get("page_end") or ""),
                    _json(meta),
                )
            )
            fts_rows.append(
                (
                    str(chunk_id),
                    str(text or ""),
                    title,
                    str(meta.get("book_title") or ""),
                    str(meta.get("section_title") or ""),
                )
            )
            if vector is not None:
                vector_rows.append((str(chunk_id), _json(vector)))

        conn.executemany(
            """
            INSERT INTO chunks (
                id, text, source, source_type, title, book_title, section_title,
                page_start, page_end, metadata_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
        conn.executemany(
            """
            INSERT INTO chunks_fts (id, text, title, book_title, section_title)
            VALUES (?, ?, ?, ?, ?)
            """,
            fts_rows,
        )
        conn.executemany(
            "INSERT INTO embeddings (chunk_id, vector_json) VALUES (?, ?)",
            vector_rows,
        )
        manifest = {
            "format": "ai_vaidya_offline_pack_v1",
            "chunk_count": len(rows),
            "embedding_count": len(vector_rows),
            "source": chroma_store.COLLECTION_NAME,
        }
        conn.executemany(
            "INSERT INTO manifest (key, value) VALUES (?, ?)",
            [(key, str(value)) for key, value in manifest.items()],
        )
        conn.commit()
        conn.execute("VACUUM")
    finally:
        conn.close()

    return {
        "path": str(output_path.resolve()),
        "chunks": len(rows),
        "embeddings": len(vector_rows),
        "bytes": output_path.stat().st_size,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Export indexed public RAG data for offline mobile use.")
    parser.add_argument(
        "--out",
        type=Path,
        default=Path("../mobile-offline/assets/ai_vaidya_knowledge.db"),
    )
    args = parser.parse_args()
    print(_json(export_offline_pack(args.out)))


if __name__ == "__main__":
    main()
