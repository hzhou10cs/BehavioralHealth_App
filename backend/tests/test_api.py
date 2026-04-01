import app.main as main_module

from app.store import SQLiteAppStore


def register_user(
    client, email: str, name: str = "Alex", password: str = "password123"
) -> dict[str, str]:
    response = client.post(
        "/auth/register",
        json={"name": name, "email": email, "password": password},
    )
    assert response.status_code == 201
    return response.json()


def auth_headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def auth_user_id_for(email: str) -> int:
    account = main_module.store.get_auth_user_by_email(email)
    assert account is not None
    return int(account["user_id"])


def test_auth_login_success(client):
    register = register_user(client, "alex@example.com", name="Alex Parker")

    response = client.post(
        "/auth/login",
        json={"email": "alex@example.com", "password": "password123"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user_name"] == "Alex Parker"
    assert body["access_token"] == register["access_token"]


def test_auth_register_duplicate_email_returns_conflict(client):
    first = client.post(
        "/auth/register",
        json={"name": "Alex", "email": "alex@example.com", "password": "password123"},
    )
    assert first.status_code == 201

    second = client.post(
        "/auth/register",
        json={"name": "Alex", "email": "alex@example.com", "password": "password123"},
    )
    assert second.status_code == 409
    assert second.json()["detail"] == "Email is already registered"


def test_auth_login_invalid_credentials(client):
    register = client.post(
        "/auth/register",
        json={"name": "Alex", "email": "alex@example.com", "password": "password123"},
    )
    assert register.status_code == 201

    response = client.post(
        "/auth/login",
        json={"email": "alex@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_conversation_routes_require_bearer_auth(client):
    create = client.post("/conversations", json={"title": "Weekly Therapy Check-in"})
    assert create.status_code == 401
    assert create.json()["detail"] == "Not authenticated"

    listed = client.get("/conversations")
    assert listed.status_code == 401
    assert listed.json()["detail"] == "Not authenticated"


def test_cors_preflight_allows_local_web_origin(client):
    response = client.options(
        "/auth/login",
        headers={
            "Origin": "http://localhost:19006",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:19006"
    assert "POST" in response.headers["access-control-allow-methods"]


def test_conversation_create_and_list_isolated_per_user(client):
    alex_auth = register_user(client, "alex@example.com")
    sam_auth = register_user(client, "sam@example.com")
    alex_headers = auth_headers(alex_auth["access_token"])
    sam_headers = auth_headers(sam_auth["access_token"])

    create = client.post(
        "/conversations",
        json={"title": "Weekly Therapy Check-in"},
        headers=alex_headers,
    )
    assert create.status_code == 201
    created = create.json()
    assert created["id"].startswith("conv-")
    assert created["title"] == "Weekly Therapy Check-in"

    alex_listed = client.get("/conversations", headers=alex_headers)
    assert alex_listed.status_code == 200
    assert [item["id"] for item in alex_listed.json()] == [created["id"]]

    sam_listed = client.get("/conversations", headers=sam_headers)
    assert sam_listed.status_code == 200
    assert sam_listed.json() == []


def test_lessons_are_seeded_and_available_per_user(client):
    auth = register_user(client, "alex@example.com")
    headers = auth_headers(auth["access_token"])

    response = client.get("/lessons", headers=headers)

    assert response.status_code == 200
    lessons = response.json()
    assert len(lessons) == 24
    assert lessons[0]["id"] == "lesson-01"
    assert lessons[0]["title"] == "Welcome"
    assert lessons[0]["status"] == "in_progress"
    assert lessons[-1]["id"] == "lesson-24"


def test_lesson_detail_returns_structured_content(client):
    auth = register_user(client, "alex@example.com")
    headers = auth_headers(auth["access_token"])

    response = client.get("/lessons/lesson-03", headers=headers)

    assert response.status_code == 200
    lesson = response.json()
    assert lesson["title"] == "SMART Goals"
    assert lesson["week"] == 3
    assert "Create one food goal" in lesson["objectives"]
    assert lesson["activity"]["type"] == "goal_builder"
    assert len(lesson["sections"]) >= 1


def test_submit_message_and_retrieve_history(client):
    auth = register_user(client, "alex@example.com")
    headers = auth_headers(auth["access_token"])
    conversation = client.post(
        "/conversations",
        json={"title": "CBT Session"},
        headers=headers,
    ).json()
    conversation_id = conversation["id"]

    submit = client.post(
        f"/conversations/{conversation_id}/messages",
        json={"role": "user", "content": "I felt anxious this morning."},
        headers=headers,
    )
    assert submit.status_code == 201
    submitted = submit.json()
    assert submitted["conversation_id"] == conversation_id
    assert submitted["role"] == "user"
    assert submitted["content"] == "I felt anxious this morning."

    history = client.get(f"/conversations/{conversation_id}/history", headers=headers)
    assert history.status_code == 200
    items = history.json()
    assert len(items) == 1
    assert items[0]["id"] == submitted["id"]


def test_conversation_routes_hide_other_users_data(client):
    alex_auth = register_user(client, "alex@example.com")
    sam_auth = register_user(client, "sam@example.com")
    alex_headers = auth_headers(alex_auth["access_token"])
    sam_headers = auth_headers(sam_auth["access_token"])

    created = client.post(
        "/conversations",
        json={"title": "Private Session"},
        headers=alex_headers,
    )
    assert created.status_code == 201
    conversation_id = created.json()["id"]

    history = client.get(f"/conversations/{conversation_id}/history", headers=sam_headers)
    assert history.status_code == 404

    reply = client.post(
        f"/conversations/{conversation_id}/assistant-reply",
        headers=sam_headers,
    )
    assert reply.status_code == 404


def test_create_assistant_reply(client):
    auth = register_user(client, "alex@example.com")
    headers = auth_headers(auth["access_token"])
    conversation = client.post(
        "/conversations",
        json={"title": "Support Session"},
        headers=headers,
    ).json()
    conversation_id = conversation["id"]

    client.post(
        f"/conversations/{conversation_id}/messages",
        json={"role": "user", "content": "I am overwhelmed by everything due this week."},
        headers=headers,
    )

    reply = client.post(f"/conversations/{conversation_id}/assistant-reply", headers=headers)
    assert reply.status_code == 201
    body = reply.json()
    assert body["conversation_id"] == conversation_id
    assert body["role"] == "assistant"
    assert "I hear you saying" in body["content"]
    assert "overwhelmed by everything due this week" in body["content"]

    history = client.get(f"/conversations/{conversation_id}/history", headers=headers)
    assert history.status_code == 200
    items = history.json()
    assert len(items) == 2
    assert items[-1]["role"] == "assistant"

    auth_user_id = auth_user_id_for("alex@example.com")
    assert main_module.store.get_coach_state(conversation_id, user_id=auth_user_id)
    assert main_module.store.get_latest_session_report(
        conversation_id, user_id=auth_user_id
    )


def test_conversation_list_shows_updated_timestamp_after_messages(client):
    auth = register_user(client, "alex@example.com")
    headers = auth_headers(auth["access_token"])
    created = client.post(
        "/conversations",
        json={"title": "Progress Check"},
        headers=headers,
    ).json()
    conversation_id = created["id"]

    client.post(
        f"/conversations/{conversation_id}/messages",
        json={"role": "user", "content": "I need help organizing my assignments."},
        headers=headers,
    )
    client.post(f"/conversations/{conversation_id}/assistant-reply", headers=headers)

    listed = client.get("/conversations", headers=headers)
    assert listed.status_code == 200
    body = listed.json()
    assert len(body) == 1
    assert body[0]["id"] == conversation_id
    assert body[0]["updated_at"] != created["updated_at"]


def test_assistant_reply_uses_latest_session_report_as_memory(client, monkeypatch):
    auth = register_user(client, "alex@example.com")
    headers = auth_headers(auth["access_token"])
    conversation = client.post(
        "/conversations",
        json={"title": "Memory Session"},
        headers=headers,
    ).json()
    conversation_id = conversation["id"]

    client.post(
        f"/conversations/{conversation_id}/messages",
        json={"role": "user", "content": "I want to sleep earlier this week."},
        headers=headers,
    )
    first_reply = client.post(
        f"/conversations/{conversation_id}/assistant-reply",
        headers=headers,
    )
    assert first_reply.status_code == 201

    client.post(
        f"/conversations/{conversation_id}/messages",
        json={"role": "user", "content": "I was still awake at 1 AM last night."},
        headers=headers,
    )

    captured: dict[str, str] = {}

    def fake_generate_assistant_reply(messages, *, memory_text="", prompt_patch=None):
        captured["memory_text"] = memory_text
        return "memory aware reply"

    monkeypatch.setattr(main_module, "generate_assistant_reply", fake_generate_assistant_reply)

    second_reply = client.post(
        f"/conversations/{conversation_id}/assistant-reply",
        headers=headers,
    )
    assert second_reply.status_code == 201
    assert second_reply.json()["content"] == "memory aware reply"
    assert "Last session report:" in captured["memory_text"]
    assert "Session Stage Report - Session" in captured["memory_text"]
    assert "Current CST:" in captured["memory_text"]


def test_debug_endpoints_return_coach_state_and_session_reports(client):
    auth = register_user(client, "alex@example.com")
    headers = auth_headers(auth["access_token"])
    conversation = client.post(
        "/conversations",
        json={"title": "Debug Session"},
        headers=headers,
    ).json()
    conversation_id = conversation["id"]

    client.post(
        f"/conversations/{conversation_id}/messages",
        json={"role": "user", "content": "I am too tired after work to exercise."},
        headers=headers,
    )
    client.post(f"/conversations/{conversation_id}/assistant-reply", headers=headers)

    coach_state = client.get(f"/conversations/{conversation_id}/coach-state", headers=headers)
    assert coach_state.status_code == 200
    coach_state_body = coach_state.json()
    assert coach_state_body["conversation_id"] == conversation_id
    assert "sleep" in coach_state_body["coach_state"]

    session_reports = client.get(
        f"/conversations/{conversation_id}/session-reports",
        headers=headers,
    )
    assert session_reports.status_code == 200
    reports_body = session_reports.json()
    assert reports_body["conversation_id"] == conversation_id
    assert len(reports_body["session_reports"]) == 1
    assert "Session Stage Report - Session" in reports_body["session_reports"][0]


def test_message_history_persists_after_store_restart(client):
    auth = register_user(client, "alex@example.com")
    headers = auth_headers(auth["access_token"])
    conversation = client.post(
        "/conversations",
        json={"title": "Restart Session"},
        headers=headers,
    ).json()
    conversation_id = conversation["id"]

    first_message = client.post(
        f"/conversations/{conversation_id}/messages",
        json={"role": "user", "content": "Please remember this after restart."},
        headers=headers,
    )
    assert first_message.status_code == 201

    db_path = main_module.store.db_path
    user_key = main_module.store.user_key

    main_module.store.close()
    main_module.store = SQLiteAppStore(db_path, user_key=user_key)

    history = client.get(f"/conversations/{conversation_id}/history", headers=headers)
    assert history.status_code == 200
    items = history.json()
    assert len(items) == 1
    assert items[0]["content"] == "Please remember this after restart."


def test_message_routes_return_404_for_unknown_conversation(client):
    auth = register_user(client, "alex@example.com")
    headers = auth_headers(auth["access_token"])

    messages = client.get("/conversations/conv-999/messages", headers=headers)
    assert messages.status_code == 404

    submit = client.post(
        "/conversations/conv-999/messages",
        json={"role": "user", "content": "Hello"},
        headers=headers,
    )
    assert submit.status_code == 404

    reply = client.post("/conversations/conv-999/assistant-reply", headers=headers)
    assert reply.status_code == 404

    coach_state = client.get("/conversations/conv-999/coach-state", headers=headers)
    assert coach_state.status_code == 404

    reports = client.get("/conversations/conv-999/session-reports", headers=headers)
    assert reports.status_code == 404
