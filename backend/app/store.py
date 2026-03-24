from datetime import datetime, timezone
from itertools import count

from app.schemas import Conversation, Message


class InMemoryStore:
    def __init__(self) -> None:
        self._conversation_seq = count(1)
        self._message_seq = count(1)
        self._conversations: dict[str, Conversation] = {}
        self._messages: dict[str, list[Message]] = {}
        self._coach_state: dict[str, dict] = {}
        self._session_reports: dict[str, list[str]] = {}

    def create_conversation(self, title: str) -> Conversation:
        now = datetime.now(timezone.utc)
        conversation_id = f"conv-{next(self._conversation_seq)}"
        conversation = Conversation(
            id=conversation_id,
            title=title,
            created_at=now,
            updated_at=now,
        )
        self._conversations[conversation_id] = conversation
        self._messages[conversation_id] = []
        self._coach_state[conversation_id] = {}
        self._session_reports[conversation_id] = []
        return conversation

    def list_conversations(self) -> list[Conversation]:
        return list(self._conversations.values())

    def has_conversation(self, conversation_id: str) -> bool:
        return conversation_id in self._conversations

    def add_message(self, conversation_id: str, role: str, content: str) -> Message:
        now = datetime.now(timezone.utc)
        message_id = f"msg-{next(self._message_seq)}"
        message = Message(
            id=message_id,
            conversation_id=conversation_id,
            role=role,
            content=content,
            created_at=now,
        )
        self._messages[conversation_id].append(message)

        conversation = self._conversations[conversation_id]
        self._conversations[conversation_id] = conversation.model_copy(
            update={"updated_at": now}
        )
        return message

    def get_messages(self, conversation_id: str) -> list[Message]:
        return self._messages.get(conversation_id, [])

    def get_coach_state(self, conversation_id: str) -> dict:
        return self._coach_state.get(conversation_id, {})

    def save_coach_state(self, conversation_id: str, payload: dict) -> None:
        self._coach_state[conversation_id] = payload

    def list_session_reports(self, conversation_id: str) -> list[str]:
        return self._session_reports.get(conversation_id, [])

    def get_latest_session_report(self, conversation_id: str) -> str:
        reports = self.list_session_reports(conversation_id)
        return reports[-1] if reports else ""

    def add_session_report(self, conversation_id: str, report: str) -> None:
        self._session_reports.setdefault(conversation_id, []).append(report)
