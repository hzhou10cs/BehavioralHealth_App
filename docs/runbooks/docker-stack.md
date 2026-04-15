# Integrated Docker Runbook

This runbook covers the full Docker-based test environment for the project:

- `backend`: FastAPI API service
- `frontend`: browser-served Expo web export with a reverse proxy to the backend
- `backend_data`: Docker volume for persisted SQLite data

## Purpose

Use this setup to:
- build the frontend and backend containers together
- start the integrated application with one command
- verify frontend-to-backend communication through Docker networking
- test login, chat, and history retrieval in the Docker environment

## Files

- `backend/Dockerfile`
- `backend/.dockerignore`
- `frontend/Dockerfile`
- `frontend/.dockerignore`
- `frontend/docker/nginx.conf`
- `docker-compose.yml`

## Prerequisites

- Docker Desktop installed and running
- Docker Compose available through `docker compose`

Verify:

```powershell
docker --version
docker compose version
```

## Build And Start The Full Stack

From the repository root:

```powershell
docker compose up --build
```

Expected result:
- Docker builds both images
- the backend starts on `http://127.0.0.1:8000`
- the frontend starts on `http://127.0.0.1:8080`
- the backend becomes `healthy`
- the frontend serves the app and proxies `/api/*` to the backend container

To run in the background:

```powershell
docker compose up -d --build
```

## Verify Application Startup

### Backend health

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
```

Expected result:

```json
{"status":"ok"}
```

### Frontend health through the container

```powershell
Invoke-WebRequest http://127.0.0.1:8080 | Select-Object StatusCode
```

Expected result:
- status code `200`

### Inter-container communication

The frontend container proxies `/api/*` to the backend container. Verify that path:

```powershell
Invoke-RestMethod http://127.0.0.1:8080/api/health
```

Expected result:

```json
{"status":"ok"}
```

That confirms the frontend container can reach the backend container.

## Test The Core Workflow In Docker

All commands below go through the frontend container proxy at `http://127.0.0.1:8080/api/...`.

### 1. Register or log in

```powershell
$register = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8080/api/auth/register -ContentType "application/json" -Body '{"email":"alex@example.com","password":"password123"}'
$token = $register.access_token
$headers = @{ Authorization = "Bearer $token" }
```

Expected result:
- response includes `access_token`
- response includes `user_name`

If the user already exists, log in instead:

```powershell
$login = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8080/api/auth/login -ContentType "application/json" -Body '{"email":"alex@example.com","password":"password123"}'
$token = $login.access_token
$headers = @{ Authorization = "Bearer $token" }
```

### 2. Create a conversation

```powershell
$conversation = Invoke-RestMethod -Method Post -Uri http://127.0.0.1:8080/api/conversations -Headers $headers -ContentType "application/json" -Body '{"title":"Docker Integrated Test"}'
$conversationId = $conversation.id
```

Expected result:
- a conversation id like `conv-1`

### 3. Send a message

```powershell
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8080/api/conversations/$conversationId/messages" -Headers $headers -ContentType "application/json" -Body '{"role":"user","content":"I need help organizing my week."}'
```

Expected result:
- a user message is returned

### 4. Generate an assistant reply

```powershell
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8080/api/conversations/$conversationId/assistant-reply" -Headers $headers
```

Expected result:
- an assistant message is returned
- in default stub mode, the reply starts with `Thanks for sharing that`

### 5. Retrieve history

```powershell
Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8080/api/conversations/$conversationId/history" -Headers $headers
```

Expected result:
- the response contains both the user message and the assistant reply

## Browser Check

Open:

- `http://127.0.0.1:8080`

Expected result:
- the login screen loads
- after logging in, you can navigate to Home, Chat, and History

## Persistence Check

The database is stored in the Docker volume `backend_data`.

To verify persistence:

1. Complete the login/chat/history flow.
2. Stop the stack:

```powershell
docker compose down
```

3. Start it again:

```powershell
docker compose up
```

4. Log in with the same account and retrieve the conversation history again.

Expected result:
- the conversation and messages still exist

To remove the stored database too:

```powershell
docker compose down -v
```

## Useful Commands

Show running services:

```powershell
docker compose ps
```

View logs:

```powershell
docker compose logs -f backend
docker compose logs -f frontend
```

Rebuild after Dockerfile or dependency changes:

```powershell
docker compose up --build
```

## Common Errors

`docker: command not found`
- Docker Desktop is not installed or not on PATH.

`Bind for 0.0.0.0:8000 failed: port is already allocated`
- Another process is already using port `8000`.
- Stop the local backend or change the backend port mapping in `docker-compose.yml`.

`Bind for 0.0.0.0:8080 failed: port is already allocated`
- Another process is already using port `8080`.
- Stop the conflicting process or change the frontend port mapping in `docker-compose.yml`.

`401 Not authenticated`
- The request is missing the `Authorization: Bearer ...` header.
- Register or log in first and reuse the returned token.

`Email is already registered`
- The backend volume already contains that user from a previous run.
- Log in instead, or reset the volume with `docker compose down -v`.

`Failed to fetch` in the browser
- Make sure both containers are running.
- Check `docker compose ps`.
- Confirm `http://127.0.0.1:8080/api/health` returns `{"status":"ok"}`.

`frontend` exits during build
- Rebuild with `docker compose up --build`.
- Check `docker compose logs frontend` for the Expo web export failure details.

## Notes

- The integrated Docker stack uses the web export of the Expo frontend for browser-based testing.
- The mobile app remains the primary product workflow outside Docker.
- This Docker stack is designed for integrated environment testing and server-oriented deployment preparation.
