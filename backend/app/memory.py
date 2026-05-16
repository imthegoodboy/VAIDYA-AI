from __future__ import annotations

import logging
import re
from collections.abc import Callable
from typing import Any, Protocol

from app.config import settings
from app.models.chat import ChatSession, ChatSessionMemory

logger = logging.getLogger(__name__)

SessionQueryRunner = Callable[
    [list[dict[str, Any]], str | None, str],
    tuple[str, str],
]


MEMORY_CUE_PHRASES = (
    "remember",
    "call me",
    "my name",
    "my age",
    "my prakriti",
    "my dosha",
    "my allergy",
    "my allergies",
    "i am",
    "i'm",
    "im ",
    "i have",
    "i prefer",
    "i like",
    "i dislike",
    "allergic",
    "allergy",
    "years old",
    "mujhe",
    "mera",
    "meri",
    "mere",
)


class MemoryStore(Protocol):
    def get_summary(self, session: ChatSession) -> str | None:
        ...

    def merge_summary_delta(self, session: ChatSession, delta: str) -> str | None:
        ...


class PostgresSummaryMemoryStore:
    def get_summary(self, session: ChatSession) -> str | None:
        memory_record = getattr(session, "memory_record", None)
        if memory_record and memory_record.summary_text:
            return memory_record.summary_text
        return getattr(session, "summary_text", None)

    def merge_summary_delta(self, session: ChatSession, delta: str) -> str | None:
        delta = delta.strip()
        if not delta:
            return self.get_summary(session)

        combined = ((self.get_summary(session) or "").strip() + "\n" + delta).strip()
        if len(combined) > settings.session_summary_max_chars:
            combined = combined[-settings.session_summary_max_chars :]
        if not hasattr(session, "memory_record"):
            session.summary_text = combined or None
            return session.summary_text
        if session.memory_record is None:
            session.memory_record = ChatSessionMemory()
        session.memory_record.summary_text = combined or None
        session.summary_text = None
        return session.memory_record.summary_text


def _normalize_memory_text(text: str) -> str:
    normalized = text.lower().replace("’", "'").replace("`", "'")
    return re.sub(r"\s+", " ", normalized).strip()


def should_extract_summary_delta(latest_user_content: str) -> bool:
    text = _normalize_memory_text(latest_user_content)
    return bool(text and any(phrase in text for phrase in MEMORY_CUE_PHRASES))


def memory_delta_for_turn(
    messages: list[dict[str, Any]],
    session_summary: str | None,
    latest_user_content: str,
    planned_delta: str | None,
    session_query_runner: SessionQueryRunner | None = None,
) -> str:
    delta = (planned_delta or "").strip()
    if delta:
        return delta[: settings.session_summary_max_chars]
    if not should_extract_summary_delta(latest_user_content):
        return ""

    if session_query_runner is None:
        from app.llm.tasks import run_session_query_agent

        session_query_runner = run_session_query_agent

    try:
        _, extracted_delta = session_query_runner(
            messages,
            session_summary,
            latest_user_content,
        )
    except Exception as e:
        logger.warning("Session memory update skipped: %s", e)
        return ""
    return extracted_delta.strip()[: settings.session_summary_max_chars]


def get_memory_store() -> MemoryStore:
    return PostgresSummaryMemoryStore()
