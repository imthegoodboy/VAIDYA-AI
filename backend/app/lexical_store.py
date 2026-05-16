from __future__ import annotations

import json
import re
import sqlite3
from pathlib import Path
from typing import Any

from app.config import settings


TOKEN_RE = re.compile(r"[\w\u0900-\u097f]+", re.UNICODE)
STOPWORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "by",
    "for",
    "from",
    "how",
    "in",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "this",
    "to",
    "what",
    "when",
    "where",
    "which",
    "who",
    "why",
    "with",
}


def _index_path() -> Path:
    path = settings.lexical_index_path
    if not path.is_absolute():
        path = (Path.cwd() / path).resolve()
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(_index_path())
    conn.row_factory = sqlite3.Row
    _ensure_schema(conn)
    return conn


def _ensure_schema(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE VIRTUAL TABLE IF NOT EXISTS rag_chunks_fts USING fts5(
            id UNINDEXED,
            document,
            source UNINDEXED,
            source_type UNINDEXED,
            title UNINDEXED,
            book_title UNINDEXED,
            section_title UNINDEXED,
            page_start UNINDEXED,
            page_end UNINDEXED,
            session_id UNINDEXED,
            upload_id UNINDEXED,
            chunk_index UNINDEXED,
            metadata_json UNINDEXED,
            tokenize = 'unicode61 remove_diacritics 2'
        )
        """
    )
    conn.commit()


def _meta_text(meta: dict[str, Any], key: str) -> str:
    value = meta.get(key)
    return "" if value is None else str(value)


def clear_collection() -> None:
    conn = _connect()
    try:
        conn.execute("DELETE FROM rag_chunks_fts")
        conn.commit()
    finally:
        conn.close()


def delete_by_session(session_id: str) -> None:
    conn = _connect()
    try:
        conn.execute("DELETE FROM rag_chunks_fts WHERE session_id = ?", (session_id,))
        conn.commit()
    finally:
        conn.close()


def upsert_chunks(
    ids: list[str],
    documents: list[str],
    metadatas: list[dict[str, Any]],
) -> None:
    if not ids:
        return
    rows = []
    for chunk_id, document, meta in zip(ids, documents, metadatas, strict=False):
        rows.append(
            (
                chunk_id,
                document,
                _meta_text(meta, "source"),
                _meta_text(meta, "source_type"),
                _meta_text(meta, "title"),
                _meta_text(meta, "book_title"),
                _meta_text(meta, "section_title"),
                _meta_text(meta, "page_start"),
                _meta_text(meta, "page_end"),
                _meta_text(meta, "session_id"),
                _meta_text(meta, "upload_id"),
                _meta_text(meta, "chunk_index"),
                json.dumps(meta, ensure_ascii=False),
            )
        )
    conn = _connect()
    try:
        conn.executemany("DELETE FROM rag_chunks_fts WHERE id = ?", [(row[0],) for row in rows])
        conn.executemany(
            """
            INSERT INTO rag_chunks_fts (
                id, document, source, source_type, title, book_title, section_title,
                page_start, page_end, session_id, upload_id, chunk_index, metadata_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
        conn.commit()
    finally:
        conn.close()


def _match_query(query: str) -> str:
    terms: list[str] = []
    seen: set[str] = set()
    for token in TOKEN_RE.findall(query.lower()):
        if len(token) < 2 or token in STOPWORDS or token in seen:
            continue
        seen.add(token)
        terms.extend(_term_variants(token))
        if len(terms) >= 24:
            break
    return " OR ".join(f"{term}*" for term in terms)


def _term_variants(token: str) -> list[str]:
    variants = [token]
    suffixes = (
        "ization",
        "ation",
        "tion",
        "sion",
        "ing",
        "ive",
        "ed",
        "es",
        "s",
    )
    for suffix in suffixes:
        if token.endswith(suffix) and len(token) > len(suffix) + 3:
            stem = token[: -len(suffix)]
            if len(stem) >= 3 and stem not in variants:
                variants.append(stem)
            break
    return variants


def count_rows() -> int:
    conn = _connect()
    try:
        row = conn.execute("SELECT count(*) FROM rag_chunks_fts").fetchone()
        return int(row[0] if row else 0)
    finally:
        conn.close()


def query_term_counts(terms: set[str]) -> dict[str, int]:
    if not terms:
        return {}
    conn = _connect()
    try:
        out: dict[str, int] = {}
        for term in terms:
            variants = _term_variants(term)
            match = " OR ".join(f"{variant}*" for variant in variants)
            try:
                row = conn.execute(
                    "SELECT count(*) FROM rag_chunks_fts WHERE rag_chunks_fts MATCH ?",
                    (match,),
                ).fetchone()
            except sqlite3.OperationalError:
                row = None
            out[term] = int(row[0] if row else 0)
        return out
    finally:
        conn.close()


def query(
    query_text: str,
    limit: int,
    session_id: str | None = None,
) -> list[dict[str, Any]]:
    match = _match_query(query_text)
    if not match:
        return []
    sql = """
        SELECT
            id,
            document,
            metadata_json,
            bm25(rag_chunks_fts) AS lexical_score
        FROM rag_chunks_fts
        WHERE rag_chunks_fts MATCH ?
          AND (source_type != 'upload' OR session_id = ?)
        ORDER BY lexical_score
        LIMIT ?
    """
    conn = _connect()
    try:
        try:
            rows = conn.execute(sql, (match, session_id or "", max(1, limit))).fetchall()
        except sqlite3.OperationalError:
            return []
    finally:
        conn.close()
    results: list[dict[str, Any]] = []
    for row in rows:
        try:
            meta = json.loads(row["metadata_json"] or "{}")
        except json.JSONDecodeError:
            meta = {}
        results.append(
            {
                "id": row["id"],
                "document": row["document"] or "",
                "metadata": meta,
                "lexical_score": float(row["lexical_score"]),
            }
        )
    return results
