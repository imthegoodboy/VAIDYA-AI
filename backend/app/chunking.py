from __future__ import annotations

from dataclasses import dataclass


@dataclass
class TextChunk:
    text: str
    index: int


def chunk_text(text: str, chunk_size: int, chunk_overlap: int) -> list[TextChunk]:
    if chunk_size <= 0:
        raise ValueError("chunk_size must be positive")
    if chunk_overlap < 0 or chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be in [0, chunk_size)")

    text = text.strip()
    if not text:
        return []

    chunks: list[TextChunk] = []
    start = 0
    idx = 0
    n = len(text)

    while start < n:
        hard_end = min(start + chunk_size, n)
        end = _best_boundary(text, start, hard_end, n)
        piece = text[start:end].strip()
        if piece:
            chunks.append(TextChunk(text=piece, index=idx))
            idx += 1
        if hard_end >= n:
            break
        next_start = max(0, end - chunk_overlap)
        if next_start <= start:
            next_start = hard_end
        start = next_start

    return chunks


def _best_boundary(text: str, start: int, hard_end: int, text_len: int) -> int:
    if hard_end >= text_len:
        return text_len
    min_end = start + max(1, int((hard_end - start) * 0.5))
    boundary_markers = ("\n\n", "\n", ". ", "; ", ": ", " ")
    for marker in boundary_markers:
        pos = text.rfind(marker, min_end, hard_end)
        if pos != -1:
            return pos + len(marker)
    return hard_end
