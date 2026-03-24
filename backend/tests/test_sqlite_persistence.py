import json
import shutil
import sqlite3
from pathlib import Path
from uuid import uuid4

import pytest

from app.sqlite_persistence import SQLiteHealthChatStore


@pytest.fixture
def workdir():
    base = Path("backend_local_tmp")
    created = base / f"sqlite-unit-{uuid4().hex}"
    created.mkdir(parents=True, exist_ok=True)
    try:
        yield created
    finally:
        shutil.rmtree(created, ignore_errors=True)


@pytest.fixture
def store(workdir):
    db_path = workdir / "health_chat.sqlite3"
    unit = SQLiteHealthChatStore(db_path)
    unit.create_schema()
    try:
        yield unit
    finally:
        unit.close()


def test_schema_creation(store):
    tables = {
        row["name"]
        for row in store.conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table'"
        ).fetchall()
    }
    assert {"users", "conversations", "messages"}.issubset(tables)

    foreign_keys_enabled = store.conn.execute("PRAGMA foreign_keys;").fetchone()[0]
    assert foreign_keys_enabled == 1


def test_insert_and_query_validation(store):
    user_id = store.create_user("linh1", goals={"focus": "sleep and anxiety"})
    conversation_id = store.create_conversation(user_id, "Daily Check-in")
    store.add_message(conversation_id, "user", "I had a stressful morning.")
    store.add_message(conversation_id, "assistant", "Let's slow down and breathe.")

    user = store.get_user(user_id)
    assert user is not None
    assert user["user_key"] == "linh1"
    assert user["goals"] == {"focus": "sleep and anxiety"}

    conversation = store.get_conversation(conversation_id)
    assert conversation is not None
    assert conversation["user_id"] == user_id
    assert conversation["title"] == "Daily Check-in"

    conversations = store.list_conversations_for_user(user_id)
    assert len(conversations) == 1
    assert conversations[0]["title"] == "Daily Check-in"

    history = store.get_chat_history(conversation_id)
    assert len(history) == 2
    assert history[0]["role"] == "user"
    assert history[1]["role"] == "assistant"
    assert history[0]["conversation_id"] == conversation_id


def test_ordered_chat_history_retrieval(store):
    user_id = store.create_user("linh2")
    conversation_id = store.create_conversation(user_id, "Ordered Chat")

    store.add_message(
        conversation_id,
        "assistant",
        "Second message in time",
        created_at="2026-01-21T10:01:00",
    )
    store.add_message(
        conversation_id,
        "user",
        "First message in time",
        created_at="2026-01-21T10:00:00",
    )

    history = store.get_chat_history(conversation_id)
    assert [row["content"] for row in history] == [
        "First message in time",
        "Second message in time",
    ]


def test_foreign_key_constraint_checks(store):
    with pytest.raises(sqlite3.IntegrityError):
        store.create_conversation(user_id=9999, title="Invalid FK")

    user_id = store.create_user("linh3")
    conversation_id = store.create_conversation(user_id, "FK checks")
    with pytest.raises(sqlite3.IntegrityError):
        store.add_message(conversation_id=9999, role="user", content="no parent convo")

    store.add_message(conversation_id, role="user", content="valid message")

    store.conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    store.conn.commit()

    assert store.get_user(user_id) is None
    assert store.get_conversation(conversation_id) is None
    assert store.get_chat_history(conversation_id) == []


def test_user_bundle_export_matches_expected_health_chat_layout(store, workdir):
    user_id = store.create_user("linh_export", goals={"goal": "reduce panic episodes"})
    conversation_id = store.create_conversation(user_id, "Session A")
    store.add_message(conversation_id, "user", "I feel overwhelmed today.")
    store.add_message(conversation_id, "assistant", "Try the 5-4-3-2-1 grounding tool.")
    store.add_coach_state(user_id, {"stress_level": 7})
    store.add_session_report(user_id, {"summary": "Patient practiced grounding."})

    user_root = store.export_user_bundle(user_id, workdir)

    assert (user_root / "chats").is_dir()
    assert (user_root / "coach_state_tracker").is_dir()
    assert (user_root / "session_report").is_dir()
    assert (user_root / "goals.json").is_file()
    assert (user_root / "chats" / "chats_index.json").is_file()

    chats_index = json.loads((user_root / "chats" / "chats_index.json").read_text())
    assert len(chats_index["chats"]) == 1

    chat_file = user_root / "chats" / chats_index["chats"][0]["file"]
    chat_payload = json.loads(chat_file.read_text())
    assert chat_payload["messages"][0]["content"] == "I feel overwhelmed today."
