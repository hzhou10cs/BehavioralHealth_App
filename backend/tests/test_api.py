def test_auth_login_success(client):
    response = client.post(
        "/auth/login",
        json={"email": "demo@health.app", "password": "password123"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user_name"] == "demo"
    assert body["access_token"] == "demo-token"


def test_auth_login_invalid_credentials(client):
    response = client.post(
        "/auth/login",
        json={"email": "alex@example.com", "password": "password123"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid credentials"


def test_auth_register_success_and_login(client):
    register_response = client.post(
        "/auth/register",
        json={
            "email": "newuser@example.com",
            "password": "VeryStrongPwd1",
            "user_name": "New User",
        },
    )
    assert register_response.status_code == 201
    register_body = register_response.json()
    assert register_body["token_type"] == "bearer"
    assert register_body["user_name"] == "New User"
    assert register_body["access_token"] == "demo-token"

    login_response = client.post(
        "/auth/login",
        json={"email": "newuser@example.com", "password": "VeryStrongPwd1"},
    )
    assert login_response.status_code == 200
    login_body = login_response.json()
    assert login_body["user_name"] == "New User"


def test_auth_register_duplicate_email_returns_conflict(client):
    first_response = client.post(
        "/auth/register",
        json={
            "email": "dup@example.com",
            "password": "VeryStrongPwd1",
            "user_name": "Dup One",
        },
    )
    assert first_response.status_code == 201

    second_response = client.post(
        "/auth/register",
        json={
            "email": "dup@example.com",
            "password": "VeryStrongPwd2",
            "user_name": "Dup Two",
        },
    )
    assert second_response.status_code == 409
    assert second_response.json()["detail"] == "Email already registered"


def test_auth_signup_alias_registers_user(client):
    response = client.post(
        "/auth/signup",
        json={
            "email": "alias@example.com",
            "password": "VeryStrongPwd1",
            "user_name": "Alias User",
        },
    )
    assert response.status_code == 201
    assert response.json()["user_name"] == "Alias User"


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


def test_message_routes_return_404_for_unknown_conversation(client):
    messages = client.get("/conversations/conv-999/messages")
    assert messages.status_code == 404

    submit = client.post(
        "/conversations/conv-999/messages",
        json={"role": "user", "content": "Hello"},
    )
    assert submit.status_code == 404
