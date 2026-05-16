from __future__ import annotations

import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.db.base import Base
from app.memory import PostgresSummaryMemoryStore
from app.models import ChatMessage, ChatSession
from app.services.chat_repository import ChatRepository


class TestChatDataIsolation(unittest.TestCase):
    def setUp(self) -> None:
        engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(bind=engine)
        self.SessionLocal = sessionmaker(bind=engine)

    def test_messages_are_ordered_inside_each_session_only(self) -> None:
        db = self.SessionLocal()
        repo = ChatRepository()
        try:
            first = ChatSession(title="First", clerk_user_id="user_1")
            second = ChatSession(title="Second", clerk_user_id="user_1")
            db.add_all([first, second])
            db.commit()

            first_user = repo.add_message(db, first.id, "user", "first chat user")
            second_user = repo.add_message(db, second.id, "user", "second chat user")
            first_assistant = repo.add_message(db, first.id, "assistant", "first chat assistant")
            db.commit()

            self.assertEqual(first_user.position, 1)
            self.assertEqual(first_assistant.position, 2)
            self.assertEqual(second_user.position, 1)
            self.assertEqual(
                [row.content for row in repo.load_messages(db, first.id)],
                ["first chat user", "first chat assistant"],
            )
            self.assertEqual(
                [row.content for row in repo.load_messages(db, second.id)],
                ["second chat user"],
            )
        finally:
            db.close()

    def test_session_list_is_scoped_to_user_and_non_empty_chats(self) -> None:
        db = self.SessionLocal()
        repo = ChatRepository()
        try:
            user_chat = ChatSession(title="Visible", clerk_user_id="user_1")
            empty_chat = ChatSession(title="Empty", clerk_user_id="user_1")
            other_user_chat = ChatSession(title="Other", clerk_user_id="user_2")
            db.add_all([user_chat, empty_chat, other_user_chat])
            db.commit()

            repo.add_message(db, user_chat.id, "user", "hello")
            repo.add_message(db, other_user_chat.id, "user", "private")
            db.commit()

            rows = repo.list_sessions_for_user(db, "user_1")
            self.assertEqual([row.title for row in rows], ["Visible"])
        finally:
            db.close()

    def test_memory_is_stored_per_session_in_separate_table(self) -> None:
        db = self.SessionLocal()
        store = PostgresSummaryMemoryStore()
        try:
            first = ChatSession(title="First", clerk_user_id="user_1")
            second = ChatSession(title="Second", clerk_user_id="user_1")
            db.add_all([first, second])
            db.commit()

            store.merge_summary_delta(first, "User prefers Hindi.")
            store.merge_summary_delta(second, "User is allergic to peanuts.")
            db.commit()

            first_memory = db.query(ChatSession).filter_by(id=first.id).one()
            second_memory = db.query(ChatSession).filter_by(id=second.id).one()

            self.assertEqual(store.get_summary(first_memory), "User prefers Hindi.")
            self.assertEqual(store.get_summary(second_memory), "User is allergic to peanuts.")
            self.assertIsNone(first_memory.summary_text)
            self.assertIsNotNone(first_memory.memory_record)
            self.assertIsNotNone(second_memory.memory_record)
        finally:
            db.close()


if __name__ == "__main__":
    unittest.main()
