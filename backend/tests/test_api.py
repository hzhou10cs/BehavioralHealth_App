def _signup_and_token(client):
    response = client.post(
        "/auth/signup",
        json={
            "email": "alex@example.com",
            "password": "password123",
            "user_name": "Alex",
        },
    )
    assert response.status_code == 201
    return response.json()["access_token"]


def test_auth_signup_and_login_success(client):
    created = client.post(
        "/auth/signup",
        json={
            "email": "alex@example.com",
            "password": "password123",
            "user_name": "Alex",
        },
    )
    assert created.status_code == 201

    response = client.post(
        "/auth/login",
        json={"email": "alex@example.com", "password": "password123"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user_name"] == "Alex"
    assert body["access_token"].startswith("user-")


def test_auth_login_invalid_credentials(client):
    client.post(
        "/auth/signup",
        json={
            "email": "alex@example.com",
            "password": "password123",
            "user_name": "Alex",
        },
    )

    response = client.post(
        "/auth/login",
        json={"email": "alex@example.com", "password": "wrong-password"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_conversation_create_and_list(client):
    token = _signup_and_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    create = client.post(
        "/conversations", json={"title": "Weekly Therapy Check-in"}, headers=headers
    )
    assert create.status_code == 201
    created = create.json()
    assert isinstance(created["id"], int)
    assert created["title"] == "Weekly Therapy Check-in"

    listed = client.get("/conversations", headers=headers)
    assert listed.status_code == 200
    body = listed.json()
    assert len(body) == 1
    assert body[0]["id"] == created["id"]


def test_submit_message_and_retrieve_history(client):
    token = _signup_and_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    conversation = client.post(
        "/conversations", json={"title": "CBT Session"}, headers=headers
    ).json()
    conversation_id = conversation["id"]

    submit = client.post(
        f"/conversations/{conversation_id}/messages",
        json={"content": "I felt anxious this morning."},
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
    assert len(items) == 2
    assert items[0]["id"] == submitted["id"]
    assert items[1]["role"] == "assistant"


def test_me_profile_update(client):
    token = _signup_and_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    me = client.get("/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["email"] == "alex@example.com"

    updated = client.put(
        "/me",
        json={
            "user_name": "Alex Rivera",
            "bio": "I like mindfulness journaling.",
            "goals": {"sleep": "7h", "stress": "lower"},
        },
        headers=headers,
    )
    assert updated.status_code == 200
    body = updated.json()
    assert body["user_name"] == "Alex Rivera"
    assert body["bio"] == "I like mindfulness journaling."
    assert body["goals"]["sleep"] == "7h"


def test_message_routes_return_404_for_unknown_conversation(client):
    token = _signup_and_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    messages = client.get("/conversations/999/messages", headers=headers)
    assert messages.status_code == 404

    submit = client.post(
        "/conversations/999/messages",
        json={"content": "Hello"},
        headers=headers,
    )
    assert submit.status_code == 404
