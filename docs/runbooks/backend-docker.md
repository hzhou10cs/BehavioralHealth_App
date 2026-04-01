# Backend Docker Runbook

This runbook covers the first Dockerized slice of the project: the FastAPI backend with persisted SQLite data.

## Purpose

Use this setup to:
- build the backend into a container
- run the API without a local Python environment
- persist conversation data in a Docker volume
- verify health, auth, chat, and history endpoints

## Files

- `backend/Dockerfile`: backend image definition
- `backend/.dockerignore`: excludes local-only files from the backend image context
- `docker-compose.yml`: backend service and persistent data volume

## Prerequisites

- Docker Desktop installed and running
- Docker Compose available through `docker compose`

Verify:

```powershell
docker --version
docker compose version
```

## Build And Start

From the repository root:

```powershell
docker compose up --build
```

Expected result:
- Docker builds the backend image from `backend/Dockerfile`
- the `backend` service starts on `http://127.0.0.1:8000`
- `docker compose ps` shows the backend as `running` or `healthy`

## Verify Startup

Check the health endpoint:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Expected result:

```json
{"status":"ok"}
```

You can also open:

- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/health`

## Test Core Workflow

### 1. Register

```powershell
$register = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/auth/register -ContentType "application/json" -Body '{"email":"alex@example.com","password":"password123"}'
$token = $register.access_token
$headers = @{ Authorization = "Bearer $token" }
```

Expected result:
- response includes `access_token`
- response includes `user_name`

### 2. Create a conversation

```powershell
$conversation = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8000/conversations -Headers $headers -ContentType "application/json" -Body '{"title":"Docker Test Session"}'
$conversationId = $conversation.id
```

Expected result:
- response returns a conversation id like `conv-1`

### 3. Send a chat message

```powershell
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/conversations/$conversationId/messages" -Headers $headers -ContentType "application/json" -Body '{"role":"user","content":"I need help organizing my week."}'
```

Expected result:
- response returns a message id like `msg-1`

### 4. Generate the assistant reply

```powershell
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/conversations/$conversationId/assistant-reply" -Headers $headers
```

Expected result:
- response returns an assistant message
- in default stub mode, the reply starts with `Thanks for sharing that`

### 5. Retrieve history

```powershell
Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8000/conversations/$conversationId/history" -Headers $headers
```

Expected result:
- the response contains the user message and the assistant reply

## Persistence Check

The compose setup stores SQLite data in the `backend_data` volume.

To confirm persistence:

1. Create a user, conversation, and message.
2. Stop the stack:

```powershell
docker compose down
```

3. Start it again:

```powershell
docker compose up
```

4. Log in with the same account and retrieve conversation history.

Expected result:
- the existing conversation and messages are still present

## Useful Commands

Start in the background:

```powershell
docker compose up -d --build
```

View logs:

```powershell
docker compose logs -f backend
```

Stop the stack:

```powershell
docker compose down
```

Stop and remove the persistent database volume:

```powershell
docker compose down -v
```

## Common Errors

`docker: command not found`
- Docker Desktop is not installed or not on PATH.

`Bind for 0.0.0.0:8000 failed: port is already allocated`
- Another process is already using port `8000`.
- Stop the local backend or change the published port in `docker-compose.yml`.

`401 Not authenticated`
- The request is missing the `Authorization: Bearer ...` header.
- Register or log in first and reuse the returned token.

`Email is already registered`
- The backend volume already contains that user from a previous run.
- Log in instead, or remove the volume with `docker compose down -v`.

`Failed to fetch` from a browser frontend
- Make sure the frontend points to `http://127.0.0.1:8000` for same-machine testing.
- Make sure the backend container is running and healthy.

## Notes

- This backend container uses SQLite and keeps data in a Docker volume.
- The assistant runs in local stub mode by default inside Docker.
- A later step can extend `docker-compose.yml` with the frontend and any additional supporting services.
