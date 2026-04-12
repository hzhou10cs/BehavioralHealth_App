import json

from app.config import Settings
from app.schemas import (
    Conversation,
    LessonActivity,
    LessonDetail,
    LessonSection,
    LessonSummary,
    Message,
)
from app.sqlite_persistence import SQLiteHealthChatStore


def _parse_prefixed_id(value: str, prefix: str) -> int:
    if not value.startswith(prefix):
        raise ValueError(f"Invalid id: {value}")
    return int(value.removeprefix(prefix))


def _conversation_model(row: dict) -> Conversation:
    return Conversation(
        id=f"conv-{row['id']}",
        title=row["title"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _message_model(row: dict) -> Message:
    return Message(
        id=f"msg-{row['id']}",
        conversation_id=f"conv-{row['conversation_id']}",
        role=row["role"],
        content=row["content"],
        created_at=row["created_at"],
    )


def _lesson_summary_model(row: dict) -> LessonSummary:
    return LessonSummary(
        id=row["id"],
        week=row["week"],
        slug=row["slug"],
        title=row["title"],
        phase=row["phase"],
        summary=row["summary"],
        status=row["status"],
    )


def _lesson_detail_model(row: dict) -> LessonDetail:
    payload = json.loads(row["content_json"])
    return LessonDetail(
        id=row["id"],
        week=row["week"],
        slug=row["slug"],
        title=row["title"],
        phase=row["phase"],
        summary=row["summary"],
        status=row["status"],
        objectives=list(payload.get("objectives", [])),
        sections=[LessonSection(**section) for section in payload.get("sections", [])],
        activity=LessonActivity(**payload["activity"]) if payload.get("activity") else None,
    )


class SQLiteAppStore:
    def __init__(self, db_path: str, *, user_key: str | None = None) -> None:
        self.db_path = db_path
        self.user_key = user_key
        self._db = SQLiteHealthChatStore(db_path)
        self._db.create_schema()
        self._default_user_id = (
            self._db.ensure_user(user_key) if user_key is not None else None
        )

    def close(self) -> None:
        self._db.close()

    def _resolve_user_id(self, user_id: int | None) -> int:
        if user_id is not None:
            return user_id
        if self._default_user_id is None:
            raise ValueError("user_id is required for this operation")
        return self._default_user_id

    def get_auth_user_by_email(self, email: str) -> dict | None:
        return self._db.get_auth_user_by_email(email)

    def get_auth_user_by_id(self, auth_user_id: int) -> dict | None:
        return self._db.get_auth_user_by_id(auth_user_id)

    def mark_tutorial_completed_for_auth_user(self, auth_user_id: int) -> None:
        self._db.mark_tutorial_completed_for_auth_user(auth_user_id)

    def create_auth_user(
        self,
        email: str,
        name: str,
        password_salt: str,
        password_hash: str,
        health_profile_json: str = "{}",
    ) -> int:
        return self._db.create_auth_user(
            email=email,
            password_salt=password_salt,
            password_hash=password_hash,
            name=name,
            health_profile_json=health_profile_json,
        )

    def get_health_profile_for_auth_user(self, auth_user_id: int) -> dict:
        return self._db.get_health_profile_for_auth_user(auth_user_id)

    def update_health_profile_for_auth_user(self, auth_user_id: int, payload: dict) -> None:
        self._db.update_health_profile_for_auth_user(auth_user_id, payload)

    def list_lessons(self, *, user_id: int | None = None) -> list[LessonSummary]:
        return [
            _lesson_summary_model(row)
            for row in self._db.list_lessons_for_user(self._resolve_user_id(user_id))
        ]

    def get_lesson(self, lesson_id: str, *, user_id: int | None = None) -> LessonDetail | None:
        row = self._db.get_lesson_for_user(self._resolve_user_id(user_id), lesson_id)
        if row is None:
            return None
        return _lesson_detail_model(row)

    def create_conversation(self, title: str, *, user_id: int | None = None) -> Conversation:
        conversation_id = self._db.create_conversation(
            self._resolve_user_id(user_id), title
        )
        row = self._db.get_conversation(conversation_id)
        if row is None:
            raise ValueError(f"Conversation {conversation_id} was not created")
        return _conversation_model(row)

    def list_conversations(self, *, user_id: int | None = None) -> list[Conversation]:
        return [
            _conversation_model(row)
            for row in self._db.list_conversations_for_user(
                self._resolve_user_id(user_id)
            )
        ]

    def has_conversation(self, conversation_id: str, *, user_id: int | None = None) -> bool:
        try:
            internal_id = _parse_prefixed_id(conversation_id, "conv-")
        except ValueError:
            return False

        row = self._db.get_conversation(internal_id)
        return row is not None and int(row["user_id"]) == self._resolve_user_id(user_id)

    def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        *,
        user_id: int | None = None,
    ) -> Message:
        internal_id = _parse_prefixed_id(conversation_id, "conv-")
        if not self.has_conversation(conversation_id, user_id=user_id):
            raise ValueError(f"Conversation {conversation_id} was not found")
        message_id = self._db.add_message(internal_id, role, content)
        row = self._db.get_message(message_id)
        if row is None:
            raise ValueError(f"Message {message_id} was not created")
        return _message_model(row)

    def get_messages(
        self, conversation_id: str, *, user_id: int | None = None
    ) -> list[Message]:
        internal_id = _parse_prefixed_id(conversation_id, "conv-")
        if not self.has_conversation(conversation_id, user_id=user_id):
            raise ValueError(f"Conversation {conversation_id} was not found")
        return [
            _message_model(row) for row in self._db.get_chat_history(internal_id)
        ]

    def get_coach_state(self, conversation_id: str, *, user_id: int | None = None) -> dict:
        internal_id = _parse_prefixed_id(conversation_id, "conv-")
        if not self.has_conversation(conversation_id, user_id=user_id):
            raise ValueError(f"Conversation {conversation_id} was not found")
        return self._db.get_conversation_coach_state(internal_id)

    def save_coach_state(
        self, conversation_id: str, payload: dict, *, user_id: int | None = None
    ) -> None:
        internal_id = _parse_prefixed_id(conversation_id, "conv-")
        if not self.has_conversation(conversation_id, user_id=user_id):
            raise ValueError(f"Conversation {conversation_id} was not found")
        self._db.save_conversation_coach_state(internal_id, payload)

    def list_session_reports(
        self, conversation_id: str, *, user_id: int | None = None
    ) -> list[str]:
        internal_id = _parse_prefixed_id(conversation_id, "conv-")
        if not self.has_conversation(conversation_id, user_id=user_id):
            raise ValueError(f"Conversation {conversation_id} was not found")
        return self._db.list_conversation_session_reports(internal_id)

    def get_latest_session_report(
        self, conversation_id: str, *, user_id: int | None = None
    ) -> str:
        reports = self.list_session_reports(conversation_id, user_id=user_id)
        return reports[-1] if reports else ""

    def add_session_report(
        self, conversation_id: str, report: str, *, user_id: int | None = None
    ) -> None:
        internal_id = _parse_prefixed_id(conversation_id, "conv-")
        if not self.has_conversation(conversation_id, user_id=user_id):
            raise ValueError(f"Conversation {conversation_id} was not found")
        self._db.add_conversation_session_report(internal_id, report)


def build_store(settings: Settings) -> SQLiteAppStore:
    return SQLiteAppStore(settings.sqlite_db_path)

