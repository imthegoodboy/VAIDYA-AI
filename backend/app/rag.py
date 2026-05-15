from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Any

from app import chroma_store, lexical_store
from app.config import settings
from app.embeddings import embed_query
from app.llm.tasks import run_rag_answer_agent


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
@dataclass
class ChunkHit:
    id: str
    document: str
    metadata: dict[str, Any]
    dense_rank: int | None = None
    lexical_rank: int | None = None
    dense_distance: float | None = None
    lexical_score: float | None = None
    labels: set[str] = field(default_factory=set)
    score: float = 0.0


def _last_user_message(messages: list[dict[str, Any]]) -> str:
    for m in reversed(messages):
        if m.get("role") == "user":
            c = m.get("content")
            return c if isinstance(c, str) else ""
    return ""


def _tokens(text: str) -> set[str]:
    return {
        token.lower()
        for token in TOKEN_RE.findall(text)
        if len(token) > 1 and token.lower() not in STOPWORDS
    }


def _query_term_weights(query_tokens: set[str]) -> dict[str, float]:
    total = max(1, lexical_store.count_rows())
    counts = lexical_store.query_term_counts(query_tokens)
    return {
        term: min(6.0, math.log((total + 1) / (counts.get(term, 0) + 1)))
        for term in query_tokens
    }


def _weighted_overlap(
    query_tokens: set[str],
    target_tokens: set[str],
    weights: dict[str, float],
) -> float:
    score = 0.0
    for term in query_tokens:
        variants = [term]
        for suffix in ("ization", "ation", "tion", "sion", "ing", "ive", "ed", "es", "s"):
            if term.endswith(suffix) and len(term) > len(suffix) + 3:
                variants.append(term[: -len(suffix)])
                break
        if term in target_tokens:
            score += weights.get(term, 1.0) * 1.5
        elif any(
            token.startswith(variant)
            for token in target_tokens
            for variant in variants
            if len(variant) >= 4
        ):
            score += weights.get(term, 1.0) * 0.45
    return score


def _allowed_for_session(meta: dict[str, Any], session_id: str | None) -> bool:
    if meta.get("source_type") != "upload":
        return True
    return bool(session_id and str(meta.get("session_id") or "") == str(session_id))


def _rrf(rank: int) -> float:
    return 1.0 / (settings.retrieval_rrf_k + rank)


def _dense_hits(query: str, limit: int, session_id: str | None) -> list[ChunkHit]:
    if not query.strip():
        return []
    q_emb = embed_query(query)
    col = chroma_store.get_collection()
    count = col.count()
    if count <= 0:
        return []
    request_n = min(count, max(limit, settings.retrieval_candidate_k))

    def collect(where: dict[str, Any]) -> list[ChunkHit]:
        res = chroma_store.query_collection(q_emb, n_results=request_n, where=where)
        ids = (res.get("ids") or [[]])[0]
        documents = (res.get("documents") or [[]])[0]
        metadatas = (res.get("metadatas") or [[]])[0]
        distances = (res.get("distances") or [[]])[0]
        rows: list[ChunkHit] = []
        for raw_id, doc, meta, dist in zip(ids, documents, metadatas, distances, strict=False):
            rows.append(
                ChunkHit(
                    id=str(raw_id),
                    document=doc or "",
                    metadata=meta or {},
                    dense_distance=float(dist) if dist is not None else None,
                    labels={"dense"},
                )
            )
        return rows

    hits = collect({"source_type": {"$ne": "upload"}})
    if session_id:
        hits.extend(collect({"session_id": str(session_id)}))

    deduped: dict[str, ChunkHit] = {}
    for hit in hits:
        if not _allowed_for_session(hit.metadata, session_id):
            continue
        existing = deduped.get(hit.id)
        if existing is None or (
            hit.dense_distance is not None
            and (
                existing.dense_distance is None
                or hit.dense_distance < existing.dense_distance
            )
        ):
            deduped[hit.id] = hit

    ranked = sorted(
        deduped.values(),
        key=lambda h: h.dense_distance if h.dense_distance is not None else float("inf"),
    )
    out: list[ChunkHit] = []
    for rank, hit in enumerate(ranked[:limit], start=1):
        out.append(
            ChunkHit(
                id=hit.id,
                document=hit.document,
                metadata=hit.metadata,
                dense_rank=rank,
                dense_distance=hit.dense_distance,
                labels={"dense"},
            )
        )
    return out


def _lexical_hits(query: str, limit: int, session_id: str | None) -> list[ChunkHit]:
    hits: list[ChunkHit] = []
    for rank, row in enumerate(lexical_store.query(query, limit, session_id), start=1):
        hits.append(
            ChunkHit(
                id=str(row["id"]),
                document=str(row["document"]),
                metadata=dict(row["metadata"]),
                lexical_rank=rank,
                lexical_score=float(row["lexical_score"]),
                labels={"bm25"},
            )
        )
    return hits


def _merge_hits(*groups: list[ChunkHit]) -> list[ChunkHit]:
    merged: dict[str, ChunkHit] = {}
    for group in groups:
        for hit in group:
            existing = merged.get(hit.id)
            if existing is None:
                merged[hit.id] = hit
                continue
            if hit.dense_rank is not None:
                existing.dense_rank = min(
                    hit.dense_rank,
                    existing.dense_rank or hit.dense_rank,
                )
                existing.dense_distance = hit.dense_distance
            if hit.lexical_rank is not None:
                existing.lexical_rank = min(
                    hit.lexical_rank,
                    existing.lexical_rank or hit.lexical_rank,
                )
                existing.lexical_score = hit.lexical_score
            existing.labels.update(hit.labels)
    return list(merged.values())


def _rerank_hits(query: str, hits: list[ChunkHit]) -> list[ChunkHit]:
    query_tokens = _tokens(query)
    term_weights = _query_term_weights(query_tokens)
    for hit in hits:
        score = 0.0
        if hit.dense_rank is not None:
            score += _rrf(hit.dense_rank)
        if hit.lexical_rank is not None:
            score += _rrf(hit.lexical_rank)

        meta_text = " ".join(
            str(hit.metadata.get(key) or "")
            for key in ("book_title", "title", "section_title", "herb_name", "book_notes")
        )
        doc_overlap = _weighted_overlap(query_tokens, _tokens(hit.document[:2000]), term_weights)
        metadata_overlap = _weighted_overlap(query_tokens, _tokens(meta_text), term_weights)
        score += min(doc_overlap, 20.0) * 0.0025
        score += min(metadata_overlap, 14.0) * 0.002

        source_type = hit.metadata.get("source_type")
        if source_type == "upload":
            score += 0.02

        if hit.dense_distance is not None and math.isfinite(hit.dense_distance):
            score += max(0.0, 0.02 - min(hit.dense_distance, 1.0) * 0.01)
        hit.score = score
    return sorted(hits, key=lambda h: h.score, reverse=True)


def _retrieve_chunk_rows(
    query: str,
    top_k: int,
    session_id: str | None = None,
) -> list[ChunkHit]:
    candidate_k = max(settings.retrieval_candidate_k, top_k)
    dense = _dense_hits(query, candidate_k, session_id)
    lexical = _lexical_hits(query, candidate_k, session_id)
    return _select_diverse_hits(_rerank_hits(query, _merge_hits(dense, lexical)), top_k)


def _hit_group_key(hit: ChunkHit) -> tuple[str, str, str, str]:
    meta = hit.metadata
    return (
        str(meta.get("source_type") or ""),
        str(meta.get("source") or ""),
        str(meta.get("page_start") or ""),
        str(meta.get("section_title") or ""),
    )


def _select_diverse_hits(hits: list[ChunkHit], limit: int) -> list[ChunkHit]:
    selected: list[ChunkHit] = []
    used_groups: set[tuple[str, str, str, str]] = set()
    for hit in hits:
        group = _hit_group_key(hit)
        if group in used_groups:
            continue
        selected.append(hit)
        used_groups.add(group)
        if len(selected) >= limit:
            return selected
    for hit in hits:
        if hit in selected:
            continue
        selected.append(hit)
        if len(selected) >= limit:
            break
    return selected


def _source_title(meta: dict[str, Any]) -> str:
    return (
        str(meta.get("book_title") or "")
        or str(meta.get("herb_name") or "")
        or str(meta.get("title") or "")
        or str(meta.get("source") or "unknown")
    )


def _page_label(meta: dict[str, Any]) -> str | None:
    start = meta.get("page_start")
    end = meta.get("page_end")
    if start in (None, ""):
        return None
    if end in (None, "", start):
        return f"p. {start}"
    return f"pp. {start}-{end}"


def _safe_source(meta: dict[str, Any]) -> str:
    source_type = meta.get("source_type")
    source = str(meta.get("source") or "unknown")
    if source.startswith(("http://", "https://")):
        return source
    if source_type == "upload":
        return source
    file_name = str(meta.get("file_name") or "").strip()
    if file_name:
        return file_name
    return source.replace("\\", "/").rstrip("/").split("/")[-1] or "indexed source"


def _format_context(hits: list[ChunkHit]) -> tuple[str, list[dict[str, Any]]]:
    blocks: list[str] = []
    sources: list[dict[str, Any]] = []
    remaining_chars = max(4000, settings.retrieval_context_max_chars)
    for rank, hit in enumerate(hits, start=1):
        meta = hit.metadata
        title = _source_title(meta)
        page = _page_label(meta)
        section = str(meta.get("section_title") or "").strip()
        source_type = meta.get("source_type")
        labels = ",".join(sorted(hit.labels)) or "dense"
        header_bits = [f"--- Source [{rank}]", f"title={title}"]
        if source_type:
            header_bits.append(f"type={source_type}")
        if page:
            header_bits.append(page)
        if section and section != title:
            header_bits.append(f"section={section}")
        header_bits.append(f"retrieval={labels}")
        header = " | ".join(header_bits) + " ---"
        doc = hit.document.strip()
        if len(doc) + len(header) > remaining_chars:
            doc = doc[: max(0, remaining_chars - len(header) - 20)].rstrip()
        if not doc:
            break
        blocks.append(f"{header}\n{doc}")
        remaining_chars -= len(header) + len(doc)
        source_item = {
            "rank": rank,
            "source": _safe_source(meta),
            "source_type": source_type,
            "title": title,
            "book_title": meta.get("book_title"),
            "section_title": meta.get("section_title"),
            "page_start": meta.get("page_start"),
            "page_end": meta.get("page_end"),
            "retrieval": labels,
            "score": round(hit.score, 6),
            "snippet": doc[:500],
        }
        sources.append(source_item)
        if remaining_chars <= 0:
            break
    return "\n\n".join(blocks), sources


def retrieve_context(
    query: str,
    top_k: int | None = None,
    session_id: str | None = None,
) -> tuple[str, list[dict[str, Any]]]:
    k = top_k or settings.retrieval_top_k
    hits = _retrieve_chunk_rows(query, k, session_id=session_id)
    return _format_context(hits)


def retrieve_context_merged(
    primary_query: str,
    secondary_query: str | None,
    top_k: int | None = None,
    session_id: str | None = None,
) -> tuple[str, list[dict[str, Any]]]:
    k = top_k or settings.retrieval_top_k
    sec = (secondary_query or "").strip()
    if not sec:
        return retrieve_context(primary_query, k, session_id=session_id)

    k_primary = max(2, (k + 1) // 2)
    k_secondary = max(1, k - k_primary)
    hits = _merge_hits(
        _retrieve_chunk_rows(primary_query.strip() or " ", k_primary, session_id=session_id),
        _retrieve_chunk_rows(sec, k_secondary, session_id=session_id),
    )
    return _format_context(_select_diverse_hits(_rerank_hits(f"{primary_query}\n{sec}", hits), k))


def chat_with_rag(
    messages: list[dict[str, Any]],
    language: str | None = None,
) -> tuple[str, list[dict[str, Any]]]:
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set")

    user_q = _last_user_message(messages)
    context, sources = retrieve_context(user_q, session_id=None)
    answer = run_rag_answer_agent(messages, None, context, language)
    return answer, sources
