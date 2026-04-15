from datetime import date

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
    assert body["tutorial_required"] is True


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
    assert response.json()["detail"] == "Wrong password or email"


def test_auth_login_lockout_after_max_failed_attempts(client):
    register = client.post(
        "/auth/register",
        json={"name": "Alex", "email": "alex@example.com", "password": "password123"},
    )
    assert register.status_code == 201

    for _ in range(5):
        response = client.post(
            "/auth/login",
            json={"email": "alex@example.com", "password": "wrong-password"},
        )
        assert response.status_code == 401

    locked_response = client.post(
        "/auth/login",
        json={"email": "alex@example.com", "password": "wrong-password"},
    )
    assert locked_response.status_code == 429
    assert "Too many failed login attempts" in locked_response.json()["detail"]


def test_auth_login_success_resets_failed_attempts(client):
    register = client.post(
        "/auth/register",
        json={"name": "Alex", "email": "alex@example.com", "password": "password123"},
    )
    assert register.status_code == 201

    for _ in range(2):
        response = client.post(
            "/auth/login",
            json={"email": "alex@example.com", "password": "wrong-password"},
        )
        assert response.status_code == 401

    success = client.post(
        "/auth/login",
        json={"email": "alex@example.com", "password": "password123"},
    )
    assert success.status_code == 200

    # After a successful login, failed attempts should be reset and invalid password should not immediately lock.
    response = client.post(
        "/auth/login",
        json={"email": "alex@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401


def test_auth_register_stores_health_profile_and_exposes_it(client):
    response = client.post(
        "/auth/register",
        json={
            "name": "Alex Parker",
            "email": "alex@example.com",
            "password": "password123",
            "health_profile": {
                "gender": "Female",
                "height": "5ft 7in",
                "initial_weight": "165",
                "allergy": "Peanuts",
                "medication": "Vitamin D",
                "lifestyle": "Walks after dinner",
                "medical_history": "Asthma"
            },
        },
    )

    assert response.status_code == 201
    token = response.json()["access_token"]

    profile_response = client.get("/auth/profile", headers=auth_headers(token))

    assert profile_response.status_code == 200
    profile = profile_response.json()["profile"]
    assert profile["gender"] == "Female"
    assert profile["height"] == "5ft 7in"
    assert profile["initial_weight"] == "165"
    assert profile["allergy"] == "Peanuts"
    assert profile["medication"] == "Vitamin D"
    assert profile["lifestyle"] == "Walks after dinner"
    assert profile["medical_history"] == "Asthma"
    assert profile["email"] == "alex@example.com"
    assert profile["register_date"] == date.today().isoformat()


def test_auth_profile_update_round_trips_saved_health_info(client):
    auth = register_user(client, "alex@example.com")
    headers = auth_headers(auth["access_token"])

    update = client.put(
        "/auth/profile",
        headers=headers,
        json={
            "first_name": "Alex",
            "last_name": "Parker",
            "gender": "Female",
            "occupation": "Teacher",
            "phone": "555-111-2222",
            "email": "",
            "height": "5ft 7in",
            "initial_weight": "160",
            "body_measurements": "Waist 32",
            "weight_statement": "Wants more energy",
            "allergy": "Pollen",
            "medication": "Inhaler",
            "lifestyle": "Daily walks",
            "medical_history": "Asthma",
            "register_date": "",
        },
    )

    assert update.status_code == 200
    updated_profile = update.json()["profile"]
    assert updated_profile["first_name"] == "Alex"
    assert updated_profile["last_name"] == "Parker"
    assert updated_profile["occupation"] == "Teacher"
    assert updated_profile["phone"] == "555-111-2222"
    assert updated_profile["email"] == "alex@example.com"
    assert updated_profile["register_date"] == date.today().isoformat()

    fetched = client.get("/auth/profile", headers=headers)
    assert fetched.status_code == 200
    assert fetched.json()["profile"] == updated_profile


def test_tutorial_completion_turns_off_first_time_flag(client):
    auth = register_user(client, "alex@example.com")
    headers = auth_headers(auth["access_token"])
    assert auth["tutorial_required"] is True

    completed = client.post("/auth/tutorial/complete", headers=headers)
    assert completed.status_code == 200
    assert completed.json()["tutorial_required"] is False

    login = client.post(
        "/auth/login",
        json={"email": "alex@example.com", "password": "password123"},
    )
    assert login.status_code == 200
    assert login.json()["tutorial_required"] is False


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
    assert lessons[1]["status"] == "locked"
    assert lessons[-1]["id"] == "lesson-24"


def test_lesson_detail_returns_structured_content(client):
    auth = register_user(client, "alex@example.com")
    headers = auth_headers(auth["access_token"])

    first = client.post("/lessons/lesson-01/complete", headers=headers)
    assert first.status_code == 200
    second = client.post("/lessons/lesson-02/complete", headers=headers)
    assert second.status_code == 200

    response = client.get("/lessons/lesson-03", headers=headers)

    assert response.status_code == 200
    lesson = response.json()
    assert lesson["title"] == "SMART Goals"
    assert lesson["week"] == 3
    assert "Create one food goal" in lesson["objectives"]
    assert lesson["activity"]["type"] == "goal_builder"
    assert len(lesson["sections"]) >= 1


def test_locked_lesson_detail_requires_previous_completion(client):
    auth = register_user(client, "alex@example.com")
    headers = auth_headers(auth["access_token"])

    response = client.get("/lessons/lesson-02", headers=headers)

    assert response.status_code == 403
    assert response.json()["detail"] == "Finish the previous lesson first"


def test_completing_lesson_unlocks_the_next_one(client):
    auth = register_user(client, "alex@example.com")
    headers = auth_headers(auth["access_token"])

    completed = client.post("/lessons/lesson-01/complete", headers=headers)

    assert completed.status_code == 200
    assert completed.json()["id"] == "lesson-01"
    assert completed.json()["status"] == "completed"

    listed = client.get("/lessons", headers=headers)
    assert listed.status_code == 200
    lessons = listed.json()
    assert lessons[0]["status"] == "completed"
    assert lessons[1]["status"] == "in_progress"

    unlocked_detail = client.get("/lessons/lesson-02", headers=headers)
    assert unlocked_detail.status_code == 200
    assert unlocked_detail.json()["status"] == "in_progress"


def test_cannot_complete_locked_lesson_out_of_order(client):
    auth = register_user(client, "alex@example.com")
    headers = auth_headers(auth["access_token"])

    response = client.post("/lessons/lesson-02/complete", headers=headers)

    assert response.status_code == 403
    assert response.json()["detail"] == "Finish the previous lesson first"


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
    assert (
        main_module.store.get_latest_session_report(
            conversation_id, user_id=auth_user_id
        )
        == ""
    )


def test_first_turn_first_session_uses_first_session_prompt(client, monkeypatch):
    auth = register_user(client, "alex@example.com")
    headers = auth_headers(auth["access_token"])
    conversation = client.post(
        "/conversations",
        json={"title": "First Session"},
        headers=headers,
    ).json()
    conversation_id = conversation["id"]

    client.post(
        f"/conversations/{conversation_id}/messages",
        json={"role": "user", "content": "I want to get healthier."},
        headers=headers,
    )

    captured: dict[str, object] = {}

    def fake_generate_assistant_reply(
        messages, *, memory_text="", prompt_patch=None, base_prompt=None, include_fewshot=None
    ):
        captured["base_prompt"] = base_prompt
        captured["include_fewshot"] = include_fewshot
        captured["prompt_patch"] = prompt_patch
        captured["memory_text"] = memory_text
        captured["user_message"] = messages[-1].content if messages else ""
        return "first-session-reply"

    monkeypatch.setattr(main_module, "generate_assistant_reply", fake_generate_assistant_reply)

    reply = client.post(f"/conversations/{conversation_id}/assistant-reply", headers=headers)
    assert reply.status_code == 201
    assert reply.json()["content"] == "first-session-reply"
    assert captured["base_prompt"] == main_module.COACH_SYSTEM_PROMPT_1ST_SESSION
    assert captured["include_fewshot"] is False
    assert captured["prompt_patch"] is None
    assert captured["user_message"] == "I want to get healthier."
    assert "Current CST:" in str(captured["memory_text"])


def test_first_turn_of_non_first_session_uses_default_prompt(client, monkeypatch):
    auth = register_user(client, "alex@example.com")
    headers = auth_headers(auth["access_token"])

    first_conversation = client.post(
        "/conversations",
        json={"title": "Session One"},
        headers=headers,
    ).json()
    first_conversation_id = first_conversation["id"]
    client.post(
        f"/conversations/{first_conversation_id}/messages",
        json={"role": "user", "content": "First session message."},
        headers=headers,
    )
    client.post(f"/conversations/{first_conversation_id}/assistant-reply", headers=headers)

    second_conversation = client.post(
        "/conversations",
        json={"title": "Session Two"},
        headers=headers,
    ).json()
    second_conversation_id = second_conversation["id"]
    client.post(
        f"/conversations/{second_conversation_id}/messages",
        json={"role": "user", "content": "Second session first turn."},
        headers=headers,
    )

    captured: dict[str, object] = {}

    def fake_generate_assistant_reply(
        messages, *, memory_text="", prompt_patch=None, base_prompt=None, include_fewshot=None
    ):
        captured["base_prompt"] = base_prompt
        captured["include_fewshot"] = include_fewshot
        captured["prompt_patch"] = prompt_patch
        return "default-session-reply"

    monkeypatch.setattr(main_module, "generate_assistant_reply", fake_generate_assistant_reply)

    reply = client.post(f"/conversations/{second_conversation_id}/assistant-reply", headers=headers)
    assert reply.status_code == 201
    assert reply.json()["content"] == "default-session-reply"
    assert captured["base_prompt"] is None
    assert captured["include_fewshot"] is None
    assert captured["prompt_patch"] is None


def test_prompt_patch_is_injected_after_first_turn(client, monkeypatch):
    auth = register_user(client, "alex@example.com")
    headers = auth_headers(auth["access_token"])
    conversation = client.post(
        "/conversations",
        json={"title": "Patched Session"},
        headers=headers,
    ).json()
    conversation_id = conversation["id"]

    client.post(
        f"/conversations/{conversation_id}/messages",
        json={"role": "user", "content": "I want to improve sleep."},
        headers=headers,
    )
    first_reply = client.post(f"/conversations/{conversation_id}/assistant-reply", headers=headers)
    assert first_reply.status_code == 201

    client.post(
        f"/conversations/{conversation_id}/messages",
        json={"role": "user", "content": "I can start tomorrow night."},
        headers=headers,
    )

    class FakeGenerator:
        def generate_prompt_patch(self, cst_state, *, chat_history_text=None, meta_text=None):
            return (
                "<PATCH>\n"
                "FOCUS: sleep\n"
                "MISSING_SMART_ASPECT: M/A/R/T\n"
                "PRIORITY: moveon_to_next_smartgoal\n"
                "ASK_TYPE: summarize_and_check\n"
                "</PATCH>"
            )

    monkeypatch.setattr(main_module, "build_generator_agent", lambda: FakeGenerator())

    captured: dict[str, object] = {}

    def fake_generate_assistant_reply(
        messages, *, memory_text="", prompt_patch=None, base_prompt=None, include_fewshot=None
    ):
        captured["prompt_patch"] = prompt_patch
        captured["base_prompt"] = base_prompt
        return "patched-reply"

    monkeypatch.setattr(main_module, "generate_assistant_reply", fake_generate_assistant_reply)

    second_reply = client.post(
        f"/conversations/{conversation_id}/assistant-reply",
        headers=headers,
    )
    assert second_reply.status_code == 201
    assert second_reply.json()["content"] == "patched-reply"
    assert captured["base_prompt"] is None
    assert "FOCUS: sleep" in str(captured["prompt_patch"])


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


def test_assistant_reply_memory_uses_previous_sessions_not_current_session(client, monkeypatch):
    auth = register_user(client, "alex@example.com")
    headers = auth_headers(auth["access_token"])
    first_conversation = client.post(
        "/conversations",
        json={"title": "Session 1"},
        headers=headers,
    ).json()
    first_conversation_id = first_conversation["id"]

    client.post(
        f"/conversations/{first_conversation_id}/messages",
        json={"role": "user", "content": "I want to sleep earlier this week."},
        headers=headers,
    )
    first_reply = client.post(
        f"/conversations/{first_conversation_id}/assistant-reply",
        headers=headers,
    )
    assert first_reply.status_code == 201
    ended = client.post(f"/conversations/{first_conversation_id}/end-session", headers=headers)
    assert ended.status_code == 200

    second_conversation = client.post(
        "/conversations",
        json={"title": "Session 2"},
        headers=headers,
    ).json()
    second_conversation_id = second_conversation["id"]

    client.post(
        f"/conversations/{second_conversation_id}/messages",
        json={"role": "user", "content": "I was still awake at 1 AM last night."},
        headers=headers,
    )

    captured: dict[str, str] = {}

    def fake_generate_assistant_reply(messages, *, memory_text="", prompt_patch=None):
        captured["memory_text"] = memory_text
        return "memory aware reply"

    monkeypatch.setattr(main_module, "generate_assistant_reply", fake_generate_assistant_reply)

    second_reply = client.post(
        f"/conversations/{second_conversation_id}/assistant-reply",
        headers=headers,
    )
    assert second_reply.status_code == 201
    assert second_reply.json()["content"] == "memory aware reply"
    assert "Previous session summarized reports:" in captured["memory_text"]
    assert "Summarized report for session 1:" in captured["memory_text"]
    assert f"Session {first_conversation_id}" in captured["memory_text"]
    assert "Current CST:" in captured["memory_text"]


def test_assistant_reply_memory_concatenates_previous_reports_in_session_order(client, monkeypatch):
    auth = register_user(client, "alex@example.com")
    headers = auth_headers(auth["access_token"])
    finished_conversation_ids: list[str] = []

    for index in range(2):
        conversation = client.post(
            "/conversations",
            json={"title": f"Finished Session {index + 1}"},
            headers=headers,
        ).json()
        conversation_id = conversation["id"]
        finished_conversation_ids.append(conversation_id)
        client.post(
            f"/conversations/{conversation_id}/messages",
            json={"role": "user", "content": f"Finished session message {index + 1}"},
            headers=headers,
        )
        client.post(f"/conversations/{conversation_id}/assistant-reply", headers=headers)
        end_response = client.post(f"/conversations/{conversation_id}/end-session", headers=headers)
        assert end_response.status_code == 200

    active_conversation = client.post(
        "/conversations",
        json={"title": "Active Session"},
        headers=headers,
    ).json()
    active_conversation_id = active_conversation["id"]
    client.post(
        f"/conversations/{active_conversation_id}/messages",
        json={"role": "user", "content": "New session kickoff"},
        headers=headers,
    )

    captured: dict[str, str] = {}

    def fake_generate_assistant_reply(messages, *, memory_text="", prompt_patch=None):
        captured["memory_text"] = memory_text
        return "ordered-memory-reply"

    monkeypatch.setattr(main_module, "generate_assistant_reply", fake_generate_assistant_reply)

    response = client.post(
        f"/conversations/{active_conversation_id}/assistant-reply",
        headers=headers,
    )
    assert response.status_code == 201
    memory_text = captured["memory_text"]
    assert "Summarized report for session 1:" in memory_text
    assert "Summarized report for session 2:" in memory_text
    assert (
        memory_text.index("Summarized report for session 1:")
        < memory_text.index("Summarized report for session 2:")
    )
    assert f"Session {finished_conversation_ids[0]}" in memory_text
    assert f"Session {finished_conversation_ids[1]}" in memory_text


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
    assert reports_body["session_reports"] == []

    ended = client.post(f"/conversations/{conversation_id}/end-session", headers=headers)
    assert ended.status_code == 200
    assert "Session Stage Report - Session" in ended.json()["report"]

    session_reports = client.get(
        f"/conversations/{conversation_id}/session-reports",
        headers=headers,
    )
    assert session_reports.status_code == 200
    reports_body = session_reports.json()
    assert reports_body["conversation_id"] == conversation_id
    assert len(reports_body["session_reports"]) == 1
    assert "Session Stage Report - Session" in reports_body["session_reports"][0]


def test_end_session_generates_single_summary_and_locks_conversation(client):
    auth = register_user(client, "alex@example.com")
    headers = auth_headers(auth["access_token"])
    conversation = client.post(
        "/conversations",
        json={"title": "Wrap-up Session"},
        headers=headers,
    ).json()
    conversation_id = conversation["id"]

    client.post(
        f"/conversations/{conversation_id}/messages",
        json={"role": "user", "content": "I made progress with a short walk."},
        headers=headers,
    )
    client.post(f"/conversations/{conversation_id}/assistant-reply", headers=headers)

    first = client.post(f"/conversations/{conversation_id}/end-session", headers=headers)
    assert first.status_code == 200
    assert "Session Stage Report - Session" in first.json()["report"]

    second = client.post(f"/conversations/{conversation_id}/end-session", headers=headers)
    assert second.status_code == 200
    assert second.json()["report"] == first.json()["report"]

    reports = client.get(f"/conversations/{conversation_id}/session-reports", headers=headers)
    assert reports.status_code == 200
    assert len(reports.json()["session_reports"]) == 1

    blocked_message = client.post(
        f"/conversations/{conversation_id}/messages",
        json={"role": "user", "content": "Can I keep chatting?"},
        headers=headers,
    )
    assert blocked_message.status_code == 409

    blocked_reply = client.post(f"/conversations/{conversation_id}/assistant-reply", headers=headers)
    assert blocked_reply.status_code == 409


def test_completed_conversations_only_include_ended_sessions(client):
    auth = register_user(client, "alex@example.com")
    headers = auth_headers(auth["access_token"])
    active = client.post(
        "/conversations",
        json={"title": "Active Session"},
        headers=headers,
    ).json()
    completed = client.post(
        "/conversations",
        json={"title": "Completed Session"},
        headers=headers,
    ).json()

    client.post(
        f"/conversations/{completed['id']}/messages",
        json={"role": "user", "content": "Wrapping up this session."},
        headers=headers,
    )
    client.post(f"/conversations/{completed['id']}/assistant-reply", headers=headers)
    client.post(f"/conversations/{completed['id']}/end-session", headers=headers)

    listed_active = client.get("/conversations", headers=headers)
    assert listed_active.status_code == 200
    active_ids = [item["id"] for item in listed_active.json()]
    assert active["id"] in active_ids
    assert completed["id"] not in active_ids

    listed_completed = client.get("/conversations/completed", headers=headers)
    assert listed_completed.status_code == 200
    completed_ids = [item["id"] for item in listed_completed.json()]
    assert completed["id"] in completed_ids
    assert active["id"] not in completed_ids

    summary = client.get(
        f"/conversations/{completed['id']}/session-summary",
        headers=headers,
    )
    assert summary.status_code == 200
    assert "Session Stage Report - Session" in summary.json()["report"]


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

    summary = client.get("/conversations/conv-999/session-summary", headers=headers)
    assert summary.status_code == 404

    end_session = client.post("/conversations/conv-999/end-session", headers=headers)
    assert end_session.status_code == 404
