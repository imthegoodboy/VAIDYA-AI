from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import pymupdf

from app.chunking import TextChunk, chunk_text


NOISE_LINE_RE = re.compile(
    r"^(page\s+(no\.?\s*)?\d+|\d+|chapter\s+\d+\s*)$",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class BookChunk:
    text: str
    metadata: dict[str, Any]


def load_book_chunks(
    books_dir: Path,
    chunk_size: int,
    chunk_overlap: int,
) -> list[BookChunk]:
    if not books_dir.is_dir():
        return []

    chunks: list[BookChunk] = []
    for book_dir in sorted(p for p in books_dir.iterdir() if p.is_dir()):
        contain_text = _read_contain(book_dir)
        for pdf_path in sorted(book_dir.glob("*.pdf")):
            chunks.extend(
                _load_pdf_chunks(
                    pdf_path,
                    book_title=_book_title(book_dir, pdf_path),
                    contain_text=contain_text,
                    chunk_size=chunk_size,
                    chunk_overlap=chunk_overlap,
                )
            )
    return chunks


def _read_contain(book_dir: Path) -> str:
    contain = book_dir / "contain.md"
    if not contain.is_file():
        return ""
    return _normalize_text(contain.read_text(encoding="utf-8", errors="ignore"))[:1600]


def _book_title(book_dir: Path, pdf_path: Path) -> str:
    title = book_dir.name.replace("_", " ").strip()
    return title or pdf_path.stem.replace("-", " ").strip()


def _load_pdf_chunks(
    pdf_path: Path,
    book_title: str,
    contain_text: str,
    chunk_size: int,
    chunk_overlap: int,
) -> list[BookChunk]:
    pages = _extract_pages(pdf_path)
    chunks: list[BookChunk] = []
    chunk_index = 0
    for page_number, text in pages:
        cleaned = _normalize_text(text)
        if len(cleaned) < 80:
            continue
        section_title = _section_title(cleaned) or book_title
        for piece in chunk_text(cleaned, chunk_size, chunk_overlap):
            contextual = _contextualize_chunk(
                piece,
                book_title=book_title,
                section_title=section_title,
                page_number=page_number,
            )
            chunks.append(
                BookChunk(
                    text=contextual,
                    metadata={
                        "source": str(pdf_path),
                        "source_type": "book_pdf",
                        "book_title": book_title,
                        "title": book_title,
                        "section_title": section_title,
                        "page_start": page_number,
                        "page_end": page_number,
                        "chunk_index": chunk_index,
                        "file_name": pdf_path.name,
                        "book_notes": contain_text,
                    },
                )
            )
            chunk_index += 1
    return chunks


def _extract_pages(pdf_path: Path) -> list[tuple[int, str]]:
    doc = pymupdf.open(pdf_path)
    try:
        return [(i + 1, page.get_text()) for i, page in enumerate(doc)]
    finally:
        doc.close()


def _normalize_text(text: str) -> str:
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    lines = [line.strip() for line in text.splitlines()]
    return "\n".join(line for line in lines if line).strip()


def _section_title(text: str) -> str | None:
    for raw_line in text.splitlines()[:12]:
        line = raw_line.strip(" -:\t")
        if not line or len(line) > 120 or NOISE_LINE_RE.match(line):
            continue
        lowered = line.lower()
        if "page no" in lowered:
            continue
        if lowered.startswith(("chapter", "section", "part ")):
            return line[:120]
        uppercase_letters = sum(1 for ch in line if ch.isalpha() and ch.isupper())
        letters = sum(1 for ch in line if ch.isalpha())
        if letters >= 5 and uppercase_letters / max(letters, 1) > 0.65:
            return line[:120]
        if ":" in line and len(line) < 90:
            return line[:120]
    return None


def _contextualize_chunk(
    chunk: TextChunk,
    *,
    book_title: str,
    section_title: str,
    page_number: int,
) -> str:
    parts = [
        f"Book: {book_title}",
        f"Section: {section_title}",
        f"Page: {page_number}",
    ]
    parts.extend(["", chunk.text])
    return "\n".join(parts)
