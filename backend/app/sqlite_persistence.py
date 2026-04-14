import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.lesson_catalog import LESSON_DEFINITIONS


class SQLiteHealthChatStore:
    def __init__(self, db_path: str | Path):
        path = Path(db_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        self.db_path = str(path)
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
                goals_json TEXT NOT NULL DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS auth_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL UNIQUE,
                name TEXT NOT NULL DEFAULT '',
                user_id INTEGER,
                tutorial_completed INTEGER NOT NULL DEFAULT 0,
                health_profile_json TEXT NOT NULL DEFAULT '{}',
                password_salt TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

            CREATE TABLE IF NOT EXISTS conversation_coach_state (
                conversation_id INTEGER PRIMARY KEY,
                payload_json TEXT NOT NULL,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS conversation_session_reports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id INTEGER NOT NULL,
                report_text TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS lesson_definitions (
                id TEXT PRIMARY KEY,
                week INTEGER NOT NULL UNIQUE,
                slug TEXT NOT NULL UNIQUE,
                title TEXT NOT NULL,
                phase TEXT NOT NULL,
                summary TEXT NOT NULL,
                content_json TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS user_lesson_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                lesson_id TEXT NOT NULL,
                status TEXT NOT NULL CHECK(status IN ('locked','available','in_progress','completed')),
                started_at TEXT,
                completed_at TEXT,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, lesson_id),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (lesson_id) REFERENCES lesson_definitions(id) ON DELETE CASCADE
            );
            """
        )
        conversation_columns = {
            row["name"]
            for row in self.conn.execute("PRAGMA table_info(conversations)").fetchall()
        }
        if "updated_at" not in conversation_columns:
            self.conn.execute("ALTER TABLE conversations ADD COLUMN updated_at TEXT")
            self.conn.execute(
                "UPDATE conversations SET updated_at = created_at WHERE updated_at IS NULL"
            )
        auth_user_columns = {
            row["name"]
            for row in self.conn.execute("PRAGMA table_info(auth_users)").fetchall()
        }
        if "name" not in auth_user_columns:
            self.conn.execute("ALTER TABLE auth_users ADD COLUMN name TEXT NOT NULL DEFAULT ''")
        if "user_id" not in auth_user_columns:
            self.conn.execute("ALTER TABLE auth_users ADD COLUMN user_id INTEGER")
        if "tutorial_completed" not in auth_user_columns:
            self.conn.execute(
                "ALTER TABLE auth_users ADD COLUMN tutorial_completed INTEGER NOT NULL DEFAULT 0"
            )
        if "health_profile_json" not in auth_user_columns:
            self.conn.execute("ALTER TABLE auth_users ADD COLUMN health_profile_json TEXT NOT NULL DEFAULT '{}'")
        self.conn.execute(
            """
            UPDATE auth_users
            SET name = substr(email, 1, instr(email, '@') - 1)
            WHERE trim(name) = '' AND instr(email, '@') > 0
            """
        )
        self._seed_lessons()
        self._backfill_auth_user_links()
        self._backfill_lesson_progress()
        self.conn.commit()

    @staticmethod
    def _timestamp() -> str:
        return datetime.now(timezone.utc).isoformat()

    @staticmethod
    def _auth_user_key(email: str) -> str:
        return f"auth:{email.lower()}"

    def _backfill_auth_user_links(self) -> None:
        rows = self.conn.execute(
            "SELECT id, email FROM auth_users WHERE user_id IS NULL"
        ).fetchall()
        for row in rows:
            user_id = self.ensure_user(self._auth_user_key(str(row["email"])))
            self.conn.execute(
                "UPDATE auth_users SET user_id = ? WHERE id = ?",
                (user_id, row["id"]),
            )
            self.ensure_lesson_progress_for_user(user_id)

    def _seed_lessons(self) -> None:
        for lesson in LESSON_DEFINITIONS:
            lesson_copy = dict(lesson)
            self.conn.execute(
                """
                INSERT INTO lesson_definitions (
                    id, week, slug, title, phase, summary, content_json, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(id) DO UPDATE SET
                    week = excluded.week,
                    slug = excluded.slug,
                    title = excluded.title,
                    phase = excluded.phase,
                    summary = excluded.summary,
                    content_json = excluded.content_json,
                    updated_at = excluded.updated_at
                """,
                (
                    lesson_copy["id"],
                    lesson_copy["week"],
                    lesson_copy["slug"],
                    lesson_copy["title"],
                    lesson_copy["phase"],
                    lesson_copy["summary"],
                    json.dumps(lesson_copy),
                ),
            )

    def _backfill_lesson_progress(self) -> None:
        rows = self.conn.execute("SELECT id FROM users ORDER BY id ASC").fetchall()
        for row in rows:
            self.ensure_lesson_progress_for_user(int(row["id"]))

    def ensure_lesson_progress_for_user(self, user_id: int) -> None:
        existing_rows = self.conn.execute(
            "SELECT lesson_id FROM user_lesson_progress WHERE user_id = ?",
            (user_id,),
        ).fetchall()
        existing_ids = {str(row["lesson_id"]) for row in existing_rows}
        for lesson in LESSON_DEFINITIONS:
            if lesson["id"] in existing_ids:
                continue
            self.conn.execute(
                """
                INSERT INTO user_lesson_progress (
                    user_id, lesson_id, status, started_at, completed_at, updated_at
                )
                VALUES (?, ?, ?, ?, NULL, ?)
                """,
                (user_id, lesson["id"], "locked", None, self._timestamp()),
            )
        self._normalize_lesson_progress_for_user(user_id)
        self.conn.commit()

    def _normalize_lesson_progress_for_user(self, user_id: int) -> None:
        rows = self.conn.execute(
            """
            SELECT
                ulp.lesson_id,
                ulp.status,
                ulp.started_at,
                ulp.completed_at
            FROM user_lesson_progress ulp
            JOIN lesson_definitions ld ON ld.id = ulp.lesson_id
            WHERE ulp.user_id = ?
            ORDER BY ld.week ASC
            """,
            (user_id,),
        ).fetchall()
        first_incomplete_seen = False

        for row in rows:
            current_status = str(row["status"])
            lesson_id = str(row["lesson_id"])
            started_at = row["started_at"]
            completed_at = row["completed_at"]

            if current_status == "completed":
                target_status = "completed"
            elif not first_incomplete_seen:
                target_status = "in_progress"
                first_incomplete_seen = True
            else:
                target_status = "locked"

            next_started_at = started_at
            next_completed_at = completed_at

            if target_status == "in_progress" and not next_started_at:
                next_started_at = self._timestamp()
            if target_status != "completed":
                next_completed_at = None

            if (
                current_status != target_status
                or started_at != next_started_at
                or completed_at != next_completed_at
            ):
                self.conn.execute(
                    """
                    UPDATE user_lesson_progress
                    SET status = ?, started_at = ?, completed_at = ?, updated_at = ?
                    WHERE user_id = ? AND lesson_id = ?
                    """,
                    (
                        target_status,
                        next_started_at,
                        next_completed_at,
                        self._timestamp(),
                        user_id,
                        lesson_id,
                    ),
                )

    def create_user(self, user_key: str, goals: dict[str, Any] | None = None) -> int:
        goals = goals or {}
        cur = self.conn.execute(
            "INSERT INTO users (user_key, goals_json) VALUES (?, ?)",
            (user_key, json.dumps(goals)),
        )
        user_id = int(cur.lastrowid)
        self.ensure_lesson_progress_for_user(user_id)
        self.conn.commit()
        return user_id

    def get_user(self, user_id: int) -> dict[str, Any] | None:
        row = self.conn.execute(
            "SELECT id, user_key, goals_json, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if row is None:
            return None

        payload = dict(row)
        payload["goals"] = json.loads(payload.pop("goals_json"))
        return payload

    def get_user_by_key(self, user_key: str) -> dict[str, Any] | None:
        row = self.conn.execute(
            "SELECT id, user_key, goals_json, created_at FROM users WHERE user_key = ?",
            (user_key,),
        ).fetchone()
        if row is None:
            return None

        payload = dict(row)
        payload["goals"] = json.loads(payload.pop("goals_json"))
        return payload

    def ensure_user(
        self, user_key: str, goals: dict[str, Any] | None = None
    ) -> int:
        existing = self.get_user_by_key(user_key)
        if existing is not None:
            return int(existing["id"])
        return self.create_user(user_key, goals=goals)

    def create_auth_user(
        self,
        email: str,
        password_salt: str,
        password_hash: str,
        name: str = "",
        health_profile_json: str = '{}',
    ) -> int:
        normalized_email = email.lower()
        resolved_name = name.strip() or normalized_email.partition("@")[0] or normalized_email
        user_id = self.ensure_user(self._auth_user_key(normalized_email))
        cur = self.conn.execute(
            """
            INSERT INTO auth_users (email, name, user_id, password_salt, password_hash, health_profile_json)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (normalized_email, resolved_name, user_id, password_salt, password_hash, health_profile_json),
        )
        self.ensure_lesson_progress_for_user(user_id)
        self.conn.commit()
        return int(cur.lastrowid)

    def get_auth_user_by_email(self, email: str) -> dict[str, Any] | None:
        row = self.conn.execute(
            """
            SELECT id, email, name, user_id, tutorial_completed, password_salt, password_hash, health_profile_json, created_at
            FROM auth_users
            WHERE email = ?
            """,
            (email.lower(),),
        ).fetchone()
        return dict(row) if row is not None else None

    def get_auth_user_by_id(self, auth_user_id: int) -> dict[str, Any] | None:
        row = self.conn.execute(
            """
            SELECT id, email, name, user_id, tutorial_completed, password_salt, password_hash, health_profile_json, created_at
            FROM auth_users
            WHERE id = ?
            """,
            (auth_user_id,),
        ).fetchone()
        return dict(row) if row is not None else None

    def mark_tutorial_completed_for_auth_user(self, auth_user_id: int) -> None:
        self.conn.execute(
            """
            UPDATE auth_users
            SET tutorial_completed = 1
            WHERE id = ?
            """,
            (auth_user_id,),
        )
        self.conn.commit()
    def get_health_profile_for_auth_user(self, auth_user_id: int) -> dict[str, Any]:
        row = self.conn.execute(
            """
            SELECT health_profile_json
            FROM auth_users
            WHERE id = ?
            """,
            (auth_user_id,),
        ).fetchone()
        if row is None:
            return {}
        try:
            return json.loads(str(row["health_profile_json"] or "{}"))
        except Exception:
            return {}

    def update_health_profile_for_auth_user(
        self, auth_user_id: int, payload: dict[str, Any]
    ) -> None:
        self.conn.execute(
            """
            UPDATE auth_users
            SET health_profile_json = ?
            WHERE id = ?
            """,
            (json.dumps(payload), auth_user_id),
        )
        self.conn.commit()

    def list_lessons_for_user(self, user_id: int) -> list[dict[str, Any]]:
        self.ensure_lesson_progress_for_user(user_id)
        rows = self.conn.execute(
            """
            SELECT
                ld.id,
                ld.week,
                ld.slug,
                ld.title,
                ld.phase,
                ld.summary,
                ld.content_json,
                ulp.status,
                ulp.started_at,
                ulp.completed_at,
                ulp.updated_at
            FROM lesson_definitions ld
            JOIN user_lesson_progress ulp ON ulp.lesson_id = ld.id
            WHERE ulp.user_id = ?
            ORDER BY ld.week ASC
            """,
            (user_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    def get_lesson_for_user(self, user_id: int, lesson_id: str) -> dict[str, Any] | None:
        self.ensure_lesson_progress_for_user(user_id)
        row = self.conn.execute(
            """
            SELECT
                ld.id,
                ld.week,
                ld.slug,
                ld.title,
                ld.phase,
                ld.summary,
                ld.content_json,
                ulp.status,
                ulp.started_at,
                ulp.completed_at,
                ulp.updated_at
            FROM lesson_definitions ld
            JOIN user_lesson_progress ulp ON ulp.lesson_id = ld.id
            WHERE ulp.user_id = ? AND ld.id = ?
            """,
            (user_id, lesson_id),
        ).fetchone()
        return dict(row) if row is not None else None

    def complete_lesson_for_user(self, user_id: int, lesson_id: str) -> dict[str, Any] | None:
        self.ensure_lesson_progress_for_user(user_id)
        row = self.get_lesson_for_user(user_id, lesson_id)
        if row is None:
            return None
        if str(row["status"]) == "locked":
            raise ValueError("locked")
        if str(row["status"]) != "completed":
            now = self._timestamp()
            self.conn.execute(
                """
                UPDATE user_lesson_progress
                SET status = 'completed',
                    started_at = COALESCE(started_at, ?),
                    completed_at = ?,
                    updated_at = ?
                WHERE user_id = ? AND lesson_id = ?
                """,
                (now, now, now, user_id, lesson_id),
            )
            self._normalize_lesson_progress_for_user(user_id)
            self.conn.commit()
        return self.get_lesson_for_user(user_id, lesson_id)

    def update_goals(self, user_id: int, goals: dict[str, Any]) -> None:
        self.conn.execute(
            "UPDATE users SET goals_json = ? WHERE id = ?",
            (json.dumps(goals), user_id),
        )
        self.conn.commit()

    def create_conversation(self, user_id: int, title: str) -> int:
        now = self._timestamp()
        cur = self.conn.execute(
            """
            INSERT INTO conversations (user_id, title, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            """,
            (user_id, title, now, now),
        )
        self.conn.commit()
        return int(cur.lastrowid)

    def get_conversation(self, conversation_id: int) -> dict[str, Any] | None:
        row = self.conn.execute(
            """
            SELECT id, user_id, title, created_at, COALESCE(updated_at, created_at) AS updated_at
            FROM conversations
            WHERE id = ?
            """,
            (conversation_id,),
        ).fetchone()
        return dict(row) if row is not None else None

    def list_conversations_for_user(self, user_id: int) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            """
            SELECT
                id,
                user_id,
                title,
                created_at,
                COALESCE(updated_at, created_at) AS updated_at
            FROM conversations
            WHERE user_id = ?
            ORDER BY datetime(COALESCE(updated_at, created_at)) ASC, id ASC
            """,
            (user_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    def get_message(self, message_id: int) -> dict[str, Any] | None:
        row = self.conn.execute(
            """
            SELECT id, conversation_id, role, content, created_at
            FROM messages
            WHERE id = ?
            """,
            (message_id,),
        ).fetchone()
        return dict(row) if row is not None else None

    def add_message(
        self,
        conversation_id: int,
        role: str,
        content: str,
        created_at: str | None = None,
    ) -> int:
        message_created_at = created_at or self._timestamp()
        if created_at is None:
            cur = self.conn.execute(
                """
                INSERT INTO messages (conversation_id, role, content, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (conversation_id, role, content, message_created_at),
            )
        else:
            cur = self.conn.execute(
                "INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)",
                (conversation_id, role, content, created_at),
            )
        self.conn.execute(
            "UPDATE conversations SET updated_at = ? WHERE id = ?",
            (message_created_at, conversation_id),
        )
        self.conn.commit()
        return int(cur.lastrowid)

    def get_conversation_coach_state(self, conversation_id: int) -> dict[str, Any]:
        row = self.conn.execute(
            """
            SELECT payload_json
            FROM conversation_coach_state
            WHERE conversation_id = ?
            """,
            (conversation_id,),
        ).fetchone()
        if row is None:
            return {}
        return json.loads(row["payload_json"])

    def save_conversation_coach_state(
        self, conversation_id: int, payload: dict[str, Any]
    ) -> None:
        payload_json = json.dumps(payload)
        self.conn.execute(
            """
            INSERT INTO conversation_coach_state (conversation_id, payload_json, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(conversation_id) DO UPDATE SET
                payload_json = excluded.payload_json,
                updated_at = excluded.updated_at
            """,
            (conversation_id, payload_json),
        )
        self.conn.commit()

    def list_conversation_session_reports(self, conversation_id: int) -> list[str]:
        rows = self.conn.execute(
            """
            SELECT report_text
            FROM conversation_session_reports
            WHERE conversation_id = ?
            ORDER BY datetime(created_at) ASC, id ASC
            """,
            (conversation_id,),
        ).fetchall()
        return [str(row["report_text"]) for row in rows]

    def add_conversation_session_report(
        self, conversation_id: int, report_text: str
    ) -> int:
        cur = self.conn.execute(
            """
            INSERT INTO conversation_session_reports (conversation_id, report_text)
            VALUES (?, ?)
            """,
            (conversation_id, report_text),
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

