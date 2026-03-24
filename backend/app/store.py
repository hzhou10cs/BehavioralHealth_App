from app.config import Settings
from app.schemas import Conversation, Message
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


class SQLiteAppStore:
    def __init__(self, db_path: str, *, user_key: str = "development-user") -> None:
        self.db_path = db_path
        self.user_key = user_key
        self._db = SQLiteHealthChatStore(db_path)
        self._db.create_schema()
        self._user_id = self._db.ensure_user(user_key)

    def close(self) -> None:
        self._db.close()

    def create_conversation(self, title: str) -> Conversation:
        conversation_id = self._db.create_conversation(self._user_id, title)
        row = self._db.get_conversation(conversation_id)
        if row is None:
            raise ValueError(f"Conversation {conversation_id} was not created")
        return _conversation_model(row)

    def list_conversations(self) -> list[Conversation]:
        return [
            _conversation_model(row)
            for row in self._db.list_conversations_for_user(self._user_id)
        ]

    def has_conversation(self, conversation_id: str) -> bool:
        try:
            internal_id = _parse_prefixed_id(conversation_id, "conv-")
        except ValueError:
            return False

        row = self._db.get_conversation(internal_id)
        return row is not None and int(row["user_id"]) == self._user_id

    def add_message(self, conversation_id: str, role: str, content: str) -> Message:
        internal_id = _parse_prefixed_id(conversation_id, "conv-")
        message_id = self._db.add_message(internal_id, role, content)
        row = self._db.get_message(message_id)
        if row is None:
            raise ValueError(f"Message {message_id} was not created")
        return _message_model(row)

    def get_messages(self, conversation_id: str) -> list[Message]:
        internal_id = _parse_prefixed_id(conversation_id, "conv-")
        return [
            _message_model(row) for row in self._db.get_chat_history(internal_id)
        ]

    def get_coach_state(self, conversation_id: str) -> dict:
        internal_id = _parse_prefixed_id(conversation_id, "conv-")
        return self._db.get_conversation_coach_state(internal_id)

    def save_coach_state(self, conversation_id: str, payload: dict) -> None:
        internal_id = _parse_prefixed_id(conversation_id, "conv-")
        self._db.save_conversation_coach_state(internal_id, payload)

    def list_session_reports(self, conversation_id: str) -> list[str]:
        internal_id = _parse_prefixed_id(conversation_id, "conv-")
        return self._db.list_conversation_session_reports(internal_id)

    def get_latest_session_report(self, conversation_id: str) -> str:
        reports = self.list_session_reports(conversation_id)
        return reports[-1] if reports else ""

    def add_session_report(self, conversation_id: str, report: str) -> None:
        internal_id = _parse_prefixed_id(conversation_id, "conv-")
        self._db.add_conversation_session_report(internal_id, report)


def build_store(settings: Settings) -> SQLiteAppStore:
    return SQLiteAppStore(settings.sqlite_db_path)
