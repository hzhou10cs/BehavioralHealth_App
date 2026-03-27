import app.main as main_module

from app.store import SQLiteAppStore


def test_auth_login_success(client):
    register = client.post(
        "/auth/register",
        json={"email": "alex@example.com", "password": "password123"},
    )
    assert register.status_code == 201

    response = client.post(
        "/auth/login",
        json={"email": "alex@example.com", "password": "password123"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user_name"] == "alex"
    assert body["access_token"] == "development-token"


def test_auth_register_duplicate_email_returns_conflict(client):
    first = client.post(
        "/auth/register",
        json={"email": "alex@example.com", "password": "password123"},
    )
    assert first.status_code == 201

    second = client.post(
        "/auth/register",
        json={"email": "alex@example.com", "password": "password123"},
    )
    assert second.status_code == 409
    assert second.json()["detail"] == "Email is already registered"


def test_auth_login_invalid_credentials(client):
    register = client.post(
        "/auth/register",
        json={"email": "alex@example.com", "password": "password123"},
    )
    assert register.status_code == 201

    response = client.post(
        "/auth/login",
        json={"email": "alex@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_conversation_create_and_list(client):
    create = client.post("/conversations", json={"title": "Weekly Therapy Check-in"})
    assert create.status_code == 201
    created = create.json()
    assert created["id"].startswith("conv-")
    assert created["title"] == "Weekly Therapy Check-in"

    listed = client.get("/conversations")
    assert listed.status_code == 200
    body = listed.json()
    assert len(body) == 1
    assert body[0]["id"] == created["id"]


def test_submit_message_and_retrieve_history(client):
    conversation = client.post("/conversations", json={"title": "CBT Session"}).json()
    conversation_id = conversation["id"]

    submit = client.post(
        f"/conversations/{conversation_id}/messages",
        json={"role": "user", "content": "I felt anxious this morning."},
    )
    assert submit.status_code == 201
    submitted = submit.json()
    assert submitted["conversation_id"] == conversation_id
    assert submitted["role"] == "user"
    assert submitted["content"] == "I felt anxious this morning."

    history = client.get(f"/conversations/{conversation_id}/history")
    assert history.status_code == 200
    items = history.json()
    assert len(items) == 1
    assert items[0]["id"] == submitted["id"]


def test_create_assistant_reply(client):
    conversation = client.post("/conversations", json={"title": "Support Session"}).json()
    conversation_id = conversation["id"]

    client.post(
        f"/conversations/{conversation_id}/messages",
        json={"role": "user", "content": "I am overwhelmed by everything due this week."},
    )

    reply = client.post(f"/conversations/{conversation_id}/assistant-reply")
    assert reply.status_code == 201
    body = reply.json()
    assert body["conversation_id"] == conversation_id
    assert body["role"] == "assistant"
    assert "I hear you saying" in body["content"]
    assert "overwhelmed by everything due this week" in body["content"]

    history = client.get(f"/conversations/{conversation_id}/history")
    assert history.status_code == 200
    items = history.json()
    assert len(items) == 2
    assert items[-1]["role"] == "assistant"
    assert main_module.store.get_coach_state(conversation_id)
    assert main_module.store.get_latest_session_report(conversation_id)


def test_conversation_list_shows_updated_timestamp_after_messages(client):
    created = client.post("/conversations", json={"title": "Progress Check"}).json()
    conversation_id = created["id"]

    client.post(
        f"/conversations/{conversation_id}/messages",
        json={"role": "user", "content": "I need help organizing my assignments."},
    )
    client.post(f"/conversations/{conversation_id}/assistant-reply")

    listed = client.get("/conversations")
    assert listed.status_code == 200
    body = listed.json()
    assert len(body) == 1
    assert body[0]["id"] == conversation_id
    assert body[0]["updated_at"] != created["updated_at"]


def test_assistant_reply_uses_latest_session_report_as_memory(client, monkeypatch):
    conversation = client.post("/conversations", json={"title": "Memory Session"}).json()
    conversation_id = conversation["id"]

    client.post(
        f"/conversations/{conversation_id}/messages",
        json={"role": "user", "content": "I want to sleep earlier this week."},
    )
    first_reply = client.post(f"/conversations/{conversation_id}/assistant-reply")
    assert first_reply.status_code == 201

    client.post(
        f"/conversations/{conversation_id}/messages",
        json={"role": "user", "content": "I was still awake at 1 AM last night."},
    )

    captured: dict[str, str] = {}

    def fake_generate_assistant_reply(messages, *, memory_text="", prompt_patch=None):
        captured["memory_text"] = memory_text
        return "memory aware reply"

    monkeypatch.setattr(main_module, "generate_assistant_reply", fake_generate_assistant_reply)

    second_reply = client.post(f"/conversations/{conversation_id}/assistant-reply")
    assert second_reply.status_code == 201
    assert second_reply.json()["content"] == "memory aware reply"
    assert "Last session report:" in captured["memory_text"]
    assert "Session Stage Report - Session" in captured["memory_text"]
    assert "Current CST:" in captured["memory_text"]


def test_debug_endpoints_return_coach_state_and_session_reports(client):
    conversation = client.post("/conversations", json={"title": "Debug Session"}).json()
    conversation_id = conversation["id"]

    client.post(
        f"/conversations/{conversation_id}/messages",
        json={"role": "user", "content": "I am too tired after work to exercise."},
    )
    client.post(f"/conversations/{conversation_id}/assistant-reply")

    coach_state = client.get(f"/conversations/{conversation_id}/coach-state")
    assert coach_state.status_code == 200
    coach_state_body = coach_state.json()
    assert coach_state_body["conversation_id"] == conversation_id
    assert "sleep" in coach_state_body["coach_state"]

    session_reports = client.get(f"/conversations/{conversation_id}/session-reports")
    assert session_reports.status_code == 200
    reports_body = session_reports.json()
    assert reports_body["conversation_id"] == conversation_id
    assert len(reports_body["session_reports"]) == 1
    assert "Session Stage Report - Session" in reports_body["session_reports"][0]


def test_message_history_persists_after_store_restart(client):
    conversation = client.post("/conversations", json={"title": "Restart Session"}).json()
    conversation_id = conversation["id"]

    first_message = client.post(
        f"/conversations/{conversation_id}/messages",
        json={"role": "user", "content": "Please remember this after restart."},
    )
    assert first_message.status_code == 201

    db_path = main_module.store.db_path
    user_key = main_module.store.user_key

    main_module.store.close()
    main_module.store = SQLiteAppStore(db_path, user_key=user_key)

    history = client.get(f"/conversations/{conversation_id}/history")
    assert history.status_code == 200
    items = history.json()
    assert len(items) == 1
    assert items[0]["content"] == "Please remember this after restart."


def test_message_routes_return_404_for_unknown_conversation(client):
    messages = client.get("/conversations/conv-999/messages")
    assert messages.status_code == 404

    submit = client.post(
        "/conversations/conv-999/messages",
        json={"role": "user", "content": "Hello"},
    )
    assert submit.status_code == 404

    reply = client.post("/conversations/conv-999/assistant-reply")
    assert reply.status_code == 404

    coach_state = client.get("/conversations/conv-999/coach-state")
    assert coach_state.status_code == 404

    reports = client.get("/conversations/conv-999/session-reports")
    assert reports.status_code == 404
