import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class SQLiteHealthChatStore:
    def __init__(self, db_path: str | Path):
        self.db_path = str(db_path)
        self.conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA foreign_keys = ON;")

    def close(self) -> None:
        self.conn.close()

    def create_schema(self) -> None:
        self.conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_key TEXT NOT NULL UNIQUE,
                email TEXT UNIQUE,
                password_hash TEXT,
                user_name TEXT,
                bio TEXT NOT NULL DEFAULT '',
                goals_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS conversations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user','assistant')),
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS coach_state_tracker (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS session_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        )
        self.conn.commit()

    def create_user(
        self,
        user_key: str,
        goals: dict[str, Any] | None = None,
        email: str | None = None,
        password_hash: str | None = None,
        user_name: str | None = None,
        bio: str = "",
    ) -> int:
        goals = goals or {}
        resolved_name = user_name or user_key
        cur = self.conn.execute(
            """
            INSERT INTO users (user_key, email, password_hash, user_name, bio, goals_json)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (user_key, email, password_hash, resolved_name, bio, json.dumps(goals)),
        )
        self.conn.commit()
        return int(cur.lastrowid)

    def update_goals(self, user_id: int, goals: dict[str, Any]) -> None:
        self.conn.execute(
            "UPDATE users SET goals_json = ? WHERE id = ?",
            (json.dumps(goals), user_id),
        )
        self.conn.commit()

    def get_user_by_email(self, email: str) -> dict[str, Any] | None:
        row = self.conn.execute(
            """
            SELECT id, user_key, email, password_hash, user_name, bio, goals_json, created_at
            FROM users
            WHERE email = ?
            """,
            (email,),
        ).fetchone()
        return dict(row) if row else None

    def get_user_by_id(self, user_id: int) -> dict[str, Any] | None:
        row = self.conn.execute(
            """
            SELECT id, user_key, email, password_hash, user_name, bio, goals_json, created_at
            FROM users
            WHERE id = ?
            """,
            (user_id,),
        ).fetchone()
        return dict(row) if row else None

    def update_user_profile(
        self, user_id: int, user_name: str, bio: str, goals: dict[str, Any]
    ) -> None:
        self.conn.execute(
            """
            UPDATE users
            SET user_name = ?, bio = ?, goals_json = ?
            WHERE id = ?
            """,
            (user_name, bio, json.dumps(goals), user_id),
        )
        self.conn.commit()

    def create_conversation(self, user_id: int, title: str) -> int:
        cur = self.conn.execute(
            "INSERT INTO conversations (user_id, title) VALUES (?, ?)",
            (user_id, title),
        )
        self.conn.commit()
        return int(cur.lastrowid)

    def add_message(
        self,
        conversation_id: int,
        role: str,
        content: str,
        created_at: str | None = None,
    ) -> int:
        if created_at is None:
            cur = self.conn.execute(
                "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
                (conversation_id, role, content),
            )
        else:
            cur = self.conn.execute(
                "INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)",
                (conversation_id, role, content, created_at),
            )

        self.conn.execute(
            "UPDATE conversations SET updated_at = ? WHERE id = ?",
            (datetime.now(timezone.utc).isoformat(), conversation_id),
        )
        self.conn.commit()
        return int(cur.lastrowid)

    def add_coach_state(
        self, user_id: int, payload: dict[str, Any], created_at: str | None = None
    ) -> int:
        if created_at is None:
            cur = self.conn.execute(
                "INSERT INTO coach_state_tracker (user_id, payload_json) VALUES (?, ?)",
                (user_id, json.dumps(payload)),
            )
        else:
            cur = self.conn.execute(
                "INSERT INTO coach_state_tracker (user_id, payload_json, created_at) VALUES (?, ?, ?)",
                (user_id, json.dumps(payload), created_at),
            )
        self.conn.commit()
        return int(cur.lastrowid)

    def add_session_report(
        self, user_id: int, payload: dict[str, Any], created_at: str | None = None
    ) -> int:
        if created_at is None:
            cur = self.conn.execute(
                "INSERT INTO session_reports (user_id, payload_json) VALUES (?, ?)",
                (user_id, json.dumps(payload)),
            )
        else:
            cur = self.conn.execute(
                "INSERT INTO session_reports (user_id, payload_json, created_at) VALUES (?, ?, ?)",
                (user_id, json.dumps(payload), created_at),
            )
        self.conn.commit()
        return int(cur.lastrowid)

    def get_conversation(self, conversation_id: int) -> dict[str, Any] | None:
        row = self.conn.execute(
            """
            SELECT id, user_id, title, created_at, updated_at
            FROM conversations
            WHERE id = ?
            """,
            (conversation_id,),
        ).fetchone()
        return dict(row) if row else None

    def list_conversations_for_user(self, user_id: int) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            """
            SELECT id, user_id, title, created_at, updated_at
            FROM conversations
            WHERE user_id = ?
            ORDER BY datetime(updated_at) DESC, id DESC
            """,
            (user_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    def get_chat_history(self, conversation_id: int) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            """
            SELECT id, conversation_id, role, content, created_at
            FROM messages
            WHERE conversation_id = ?
            ORDER BY datetime(created_at) ASC, id ASC
            """,
            (conversation_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    def export_user_bundle(self, user_id: int, root_dir: str | Path) -> Path:
        user = self.conn.execute(
            "SELECT id, user_key, goals_json FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if user is None:
            raise ValueError(f"user {user_id} not found")

        root = Path(root_dir)
        user_root = root / str(user["user_key"])
        chats_dir = user_root / "chats"
        coach_dir = user_root / "coach_state_tracker"
        reports_dir = user_root / "session_report"
        chats_dir.mkdir(parents=True, exist_ok=True)
        coach_dir.mkdir(parents=True, exist_ok=True)
        reports_dir.mkdir(parents=True, exist_ok=True)

        conversations = self.list_conversations_for_user(user_id)
        chats_index: list[dict[str, Any]] = []
        for idx, convo in enumerate(conversations, start=1):
            messages = self.get_chat_history(int(convo["id"]))
            payload = {
                "conversation_id": convo["id"],
                "title": convo["title"],
                "messages": messages,
            }
            file_name = f"chat{idx}.json"
            (chats_dir / file_name).write_text(
                json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            chats_index.append(
                {
                    "conversation_id": convo["id"],
                    "title": convo["title"],
                    "file": file_name,
                    "message_count": len(messages),
                }
            )

        (chats_dir / "chats_index.json").write_text(
            json.dumps({"chats": chats_index}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        coach_rows = self.conn.execute(
            "SELECT id, payload_json, created_at FROM coach_state_tracker WHERE user_id = ? ORDER BY datetime(created_at), id",
            (user_id,),
        ).fetchall()
        for idx, row in enumerate(coach_rows, start=1):
            payload = json.loads(row["payload_json"])
            payload["_meta"] = {"id": row["id"], "created_at": row["created_at"]}
            (coach_dir / f"cst{idx}.json").write_text(
                json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
            )

        report_rows = self.conn.execute(
            "SELECT id, payload_json, created_at FROM session_reports WHERE user_id = ? ORDER BY datetime(created_at), id",
            (user_id,),
        ).fetchall()
        for idx, row in enumerate(report_rows, start=1):
            payload = json.loads(row["payload_json"])
            payload["_meta"] = {"id": row["id"], "created_at": row["created_at"]}
            (reports_dir / f"session_report{idx}.json").write_text(
                json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
            )

        (user_root / "goals.json").write_text(
            json.dumps(json.loads(user["goals_json"]), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        return user_root
