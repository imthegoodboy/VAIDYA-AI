from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import pymupdf

from app import chroma_store, lexical_store
from app.chunking import chunk_text
from app.ingest.books import load_book_chunks
from app.rag import _allowed_for_session, _format_context, _select_diverse_hits, _weighted_overlap, ChunkHit


class TestChunking(unittest.TestCase):
    def test_chunking_prefers_readable_boundaries(self) -> None:
        text = "First paragraph has useful context.\n\nSecond paragraph explains Agni. Third sentence continues."
        chunks = chunk_text(text, chunk_size=58, chunk_overlap=8)
        self.assertGreaterEqual(len(chunks), 2)
        self.assertTrue(chunks[0].text.endswith("context."))
        self.assertIn("Second paragraph", chunks[1].text)


class TestBookChunking(unittest.TestCase):
    def test_pdf_pages_become_contextual_book_chunks(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            book_dir = Path(td) / "Charaka_Samhita"
            book_dir.mkdir()
            (book_dir / "contain.md").write_text(
                "Contains:\ndoshas\nagni\ndigestion",
                encoding="utf-8",
            )
            pdf_path = book_dir / "charaka.pdf"
            doc = pymupdf.open()
            page = doc.new_page()
            page.insert_text(
                (72, 72),
                "Chapter 1: Agni\nAgni is described as central to digestion and health. " * 8,
            )
            doc.save(pdf_path)
            doc.close()

            chunks = load_book_chunks(Path(td), chunk_size=240, chunk_overlap=40)

        self.assertGreaterEqual(len(chunks), 1)
        first = chunks[0]
        self.assertIn("Book: Charaka Samhita", first.text)
        self.assertIn("Contains:", first.metadata["book_notes"])
        self.assertEqual(first.metadata["source_type"], "book_pdf")
        self.assertEqual(first.metadata["book_title"], "Charaka Samhita")
        self.assertEqual(first.metadata["page_start"], 1)


class TestStableChunkIds(unittest.TestCase):
    def test_stable_ids_use_source_metadata(self) -> None:
        meta = {
            "source": "books/charaka.pdf",
            "source_type": "book_pdf",
            "book_title": "Charaka",
            "page_start": 12,
            "chunk_index": 4,
        }
        first = chroma_store.stable_chunk_id(meta, "old text")
        second = chroma_store.stable_chunk_id(meta, "new text")
        self.assertEqual(first, second)

    def test_stable_ids_distinguish_repeated_source_records(self) -> None:
        base = {
            "source": "data/herb.json",
            "source_type": "herb_json",
            "herb_name": "Punarnava",
            "chunk_index": 0,
        }
        first = chroma_store.stable_chunk_id({**base, "record_index": 1}, "same")
        second = chroma_store.stable_chunk_id({**base, "record_index": 2}, "same")
        self.assertNotEqual(first, second)

    def test_weak_ids_include_document_hash(self) -> None:
        meta = {"source_type": "manual"}
        first = chroma_store.stable_chunk_id(meta, "old text")
        second = chroma_store.stable_chunk_id(meta, "new text")
        self.assertNotEqual(first, second)


class TestLexicalIndex(unittest.TestCase):
    def test_lexical_query_excludes_other_upload_sessions(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            with patch.object(
                lexical_store.settings,
                "lexical_index_path",
                Path(td) / "rag_fts.sqlite3",
            ):
                lexical_store.clear_collection()
                lexical_store.upsert_chunks(
                    ["public", "private"],
                    [
                        "Agni supports digestion in Ayurveda.",
                        "Private uploaded prescription note.",
                    ],
                    [
                        {"source": "Charaka", "source_type": "book_pdf"},
                        {
                            "source": "rx.pdf",
                            "source_type": "upload",
                            "session_id": "s1",
                        },
                    ],
                )

                public_hits = lexical_store.query("private prescription", 5, None)
                owner_hits = lexical_store.query("private prescription", 5, "s1")
                other_hits = lexical_store.query("private prescription", 5, "s2")

        self.assertEqual([hit["id"] for hit in public_hits], [])
        self.assertEqual([hit["id"] for hit in owner_hits], ["private"])
        self.assertEqual([hit["id"] for hit in other_hits], [])

    def test_lexical_query_matches_word_prefixes(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            with patch.object(
                lexical_store.settings,
                "lexical_index_path",
                Path(td) / "rag_fts.sqlite3",
            ):
                lexical_store.clear_collection()
                lexical_store.upsert_chunks(
                    ["digestive"],
                    ["Agni is the digestive fire in this source."],
                    [{"source": "book", "source_type": "book_pdf"}],
                )

                hits = lexical_store.query("digestion", 5, None)

        self.assertEqual([hit["id"] for hit in hits], ["digestive"])

    def test_lexical_term_counts_are_source_driven(self) -> None:
        with tempfile.TemporaryDirectory() as td:
            with patch.object(
                lexical_store.settings,
                "lexical_index_path",
                Path(td) / "rag_fts.sqlite3",
            ):
                lexical_store.clear_collection()
                lexical_store.upsert_chunks(
                    ["a", "b"],
                    ["Turmeric appears once.", "Wound and wound healing appear often."],
                    [
                        {"source": "a", "source_type": "book_pdf"},
                        {"source": "b", "source_type": "book_pdf"},
                    ],
                )

                counts = lexical_store.query_term_counts({"turmeric", "wound"})

        self.assertEqual(counts["turmeric"], 1)
        self.assertEqual(counts["wound"], 1)


class TestRagFormatting(unittest.TestCase):
    def test_upload_chunks_require_matching_session(self) -> None:
        self.assertTrue(_allowed_for_session({"source_type": "book_pdf"}, None))
        self.assertFalse(
            _allowed_for_session({"source_type": "upload", "session_id": "s1"}, None)
        )
        self.assertTrue(
            _allowed_for_session({"source_type": "upload", "session_id": "s1"}, "s1")
        )

    def test_context_uses_safe_source_metadata(self) -> None:
        hit = ChunkHit(
            id="c1",
            document="Book: Charaka\nPage: 12\nAgni supports digestion.",
            metadata={
                "source": r"C:\Users\parth\project\books\Charaka\charaka.pdf",
                "source_type": "book_pdf",
                "book_title": "Charaka",
                "page_start": 12,
                "file_name": "charaka.pdf",
            },
            dense_rank=1,
            score=1.0,
        )
        context, sources = _format_context([hit])
        self.assertIn("Source [1]", context)
        self.assertEqual(sources[0]["source"], "charaka.pdf")
        self.assertEqual(sources[0]["page_start"], 12)

    def test_diverse_selection_prefers_distinct_pages(self) -> None:
        hits = [
            ChunkHit("a", "one", {"source": "book.pdf", "page_start": 1}, score=3),
            ChunkHit("b", "two", {"source": "book.pdf", "page_start": 1}, score=2),
            ChunkHit("c", "three", {"source": "book.pdf", "page_start": 2}, score=1),
        ]
        selected = _select_diverse_hits(hits, 2)
        self.assertEqual([hit.id for hit in selected], ["a", "c"])

    def test_exact_token_overlap_beats_prefix_overlap(self) -> None:
        weights = {"agni": 2.0}
        exact = _weighted_overlap({"agni"}, {"agni", "digestive"}, weights)
        prefix = _weighted_overlap({"agni"}, {"agnikarma"}, weights)
        self.assertGreater(exact, prefix)


if __name__ == "__main__":
    unittest.main()
