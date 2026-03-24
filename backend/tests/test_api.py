def test_auth_login_success(client):
    response = client.post(
        "/auth/login",
        json={"email": "alex@example.com", "password": "password123"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user_name"] == "alex"
    assert body["access_token"] == "development-token"


def test_auth_login_invalid_credentials(client):
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
