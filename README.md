# BehavioralHealth App

BehavioralHealth App is a full-stack project with:
- an Expo / React Native frontend
- a FastAPI backend
- SQLite persistence
- automated backend and frontend tests
- an optional Docker workflow for integrated environment testing

Current capabilities include:
- registering and logging in
- capturing and editing a health intake profile during and after registration
- creating and listing conversations
- sending messages
- generating an assistant reply from the backend
- viewing chat history
- navigating between dedicated app screens with Expo Router
- tracking coach state from conversation updates
- generating session report memory for later assistant replies

## Prerequisites

Install the following before you begin:
- Node.js LTS
- npm
- Python 3.13 recommended
- Docker Desktop optional for the Docker workflows

Recommended download sources:
- Node.js: `https://nodejs.org/`
- Python: `https://www.python.org/downloads/`
- Docker Desktop: `https://www.docker.com/products/docker-desktop/`

Confirm your tools are available:

```powershell
node -v
npm -v
py -0
docker --version
docker compose version
```

Notes:
- On Windows, `py -0` should show a Python version such as `3.13`.
- If PowerShell blocks `npm`, use `npm.cmd` instead of `npm`.
- Docker is optional unless you want the Docker setup paths below.

## First-Time Setup

Use this section once on a new machine before following any Quickstart path.

### Windows PowerShell

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements-dev.txt
cd ..
cd frontend
npm.cmd install
cd ..
```

Optional env files:

```powershell
Copy-Item backend\.env.example backend\.env
Copy-Item frontend\.env.example frontend\.env
```

### macOS / Linux / Git Bash

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements-dev.txt
cd ..
cd frontend
npm install
cd ..
```

Optional env files:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Optional OpenAI setup:
- The app runs without OpenAI access. If you skip this, the backend stays in safe local test mode and chat replies use the built-in stub behavior.
- To use OpenAI for real assistant replies, update `backend/.env` with:

```env
BHA_ASSISTANT_TEST_MODE=false
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
BHA_ASSISTANT_MODEL_NAME=gpt-4.1-mini
```

Phone-testing extras:
- Install Expo Go on your phone.

## Quickstart

Use this section for the three main ways to run the project, in priority order after completing First-Time Setup.

### 1. Mobile Workflow: Docker Backend + Local Frontend

Use this when you want the primary phone-testing workflow for the app.

1. Start the backend in Docker:

```powershell
docker compose up --build backend
```

2. In a second terminal, start the Expo frontend for phone mode:

```powershell
npm.cmd run check:frontend:phone
npm.cmd run frontend:phone
```

3. Open Expo Go on your phone and scan the QR code.

What to expect:
- the backend is available on port `8000`
- the frontend syncs `frontend/.env` to your current LAN IP
- the frontend preflight checks only the frontend requirements for this Docker-backed flow
- Expo starts in LAN mode for phone testing
- your phone should be able to reach `http://YOUR_LOCAL_IP:8000/health`

### 2. Integrated Docker Stack: Frontend + Backend

Use this when you want the quickest reproducible integrated environment on one machine.

```powershell
docker compose up --build
```

Then open:
- `http://127.0.0.1:8080` for the frontend
- `http://127.0.0.1:8000/docs` for backend Swagger

Important:
- this Docker stack serves the frontend as a web app for integrated testing
- the mobile app workflow still uses Expo locally

### 3. Fully Local Development

Use this when you want both the backend and frontend running locally.

Windows PowerShell:

```powershell
npm.cmd run check
npm.cmd run app
```

macOS / Linux / Git Bash:

```bash
npm run check
npm run app
```

What to expect:
- the backend starts on `http://127.0.0.1:8000`
- Expo starts in a second process for the frontend
- the app opens to the login screen, then routes to Home, Chat, and History after authentication

The detailed sections below follow this same order: phone workflow first, integrated Docker second, and fully local development third.

## Phone Testing

Use this when testing the mobile app with Expo Go.

### Phone Testing With Expo Go

Use this path when both your phone and computer are on the same Wi-Fi network.

1. Install Expo Go on your phone.
2. From the repo root, run:

```powershell
npm.cmd run check:phone
npm.cmd run app:phone
```

What these commands do:
- detect your local network IP address
- update `frontend/.env` to use that IP for `EXPO_PUBLIC_API_URL`
- warn if the selected phone API URL looks like a virtual or low-confidence adapter
- start the backend on `0.0.0.0`
- start Expo in LAN mode

3. Scan the Expo QR code with your phone.

If Expo LAN mode fails on your network, try:

```powershell
cd frontend
npm.cmd start -- --tunnel
```

### Phone Testing With Docker Backend

Use this when you want the backend containerized but still want the real mobile app flow through Expo Go.

1. Start the backend container:

```powershell
docker compose up --build backend
```

2. In a second terminal:

```powershell
npm.cmd run check:frontend:phone
npm.cmd run frontend:phone
```

This path uses the frontend-only phone preflight because the backend is already running in Docker.

3. On your phone browser, open:

```text
http://YOUR_LOCAL_IP:8000/health
```

Expected result:

```json
{"status":"ok"}
```

4. Scan the Expo QR code with Expo Go.

Why this split is recommended:
- Docker is a strong fit for the backend and persisted services
- Expo mobile development works better on the host machine than inside containers
- this gives you a reliable phone workflow without sacrificing the backend Docker environment

If you prefer helper scripts for the phone workflow:

Windows PowerShell:

```powershell
docker compose up --build backend
```

Then in a second terminal:

```powershell
.\run_frontend.ps1 -Phone
```

macOS / Linux / Git Bash:

```bash
docker compose up --build backend
```

Then in a second terminal:

```bash
./run_frontend.sh --phone
```

## Docker Testing

Use this when you want the simplest integrated environment with minimal local Python setup.

### Integrated Docker Stack

The integrated Docker environment includes:
- `backend`: FastAPI API service
- `frontend`: browser-served Expo web export with a reverse proxy to the backend
- `backend_data`: Docker volume for persisted SQLite data

This Docker workflow is for:
- integrated environment testing
- demos
- deployment-style validation

The mobile app remains the primary workflow outside Docker.

Start the full stack:

```powershell
docker compose up --build
```

Expected result:
- the backend starts on `http://127.0.0.1:8000`
- the frontend starts on `http://127.0.0.1:8080`
- `http://127.0.0.1:8080/api/health` proxies from the frontend container to the backend container
- the backend database persists in the `backend_data` Docker volume

Stop the stack:

```powershell
docker compose down
```

Remove the persisted Docker database volume too:

```powershell
docker compose down -v
```

### Docker Backend Only

If you only want the backend container:

```powershell
docker compose up --build backend
```

That starts only the backend on port `8000` with persisted SQLite storage.

### Docker Validation

To run the integrated Docker environment instead of the local frontend/backend workflow:

```powershell
docker compose up --build
```

Then verify:
- frontend: `http://127.0.0.1:8080`
- backend docs: `http://127.0.0.1:8000/docs`
- proxy health check: `http://127.0.0.1:8080/api/health`

Detailed runbooks:
- `docs/runbooks/docker-stack.md`
- `docs/runbooks/backend-docker.md`

## Local Development Setup

This is the standard day-to-day development workflow when you want both frontend and backend running locally.

### Backend Setup

Windows PowerShell:

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements-dev.txt
```

macOS / Linux / Git Bash:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements-dev.txt
```

Optional backend env file:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS / Linux / Git Bash:

```bash
cp .env.example .env
```

The backend `.env` file controls the chat-agent service configuration.
It is loaded from `backend/.env` even when you start the app from the repo root with `npm run app` or `npm run app:phone`.
If you do not configure OpenAI, the app still runs in local test mode with stub chat replies.

OpenAI notes:
- `OPENAI_API_KEY` works directly in this backend as a convenience alias.
- `BHA_ASSISTANT_LLM_API_KEY` also works if you prefer the explicit backend-prefixed setting.
- If you turn test mode off and keep the old stub defaults, the backend automatically switches to `https://api.openai.com` and `gpt-4.1-mini`.
- A blank `BHA_ASSISTANT_LLM_BASE_URL` is also treated as the default OpenAI path when test mode is off and an API key is present.
- You can still point `BHA_ASSISTANT_LLM_BASE_URL` at any other OpenAI-compatible service.

SQLite details:
- data is stored in SQLite
- the database path is controlled by `BHA_SQLITE_DB_PATH`
- the default path is `data/behavioral_health.sqlite3` inside `backend`

### Frontend Setup

Install dependencies from the `frontend` folder:

```powershell
cd frontend
npm.cmd install
```

Optional frontend env file:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS / Linux / Git Bash:

```bash
cp .env.example .env
```

Root tooling behavior:
- `npm run check`, `npm run frontend`, and `npm run app` keep `frontend/.env` in localhost mode
- `npm run check:phone`, `npm run frontend:phone`, and `npm run app:phone` sync `frontend/.env` to your current LAN IP for the full local phone workflow
- `npm run check:frontend:phone` is the frontend-only preflight for the Docker-backend phone workflow
- `npm run check:phone` and `npm run check:frontend:phone` print the selected interface and warn, but do not fail, if the detected phone API URL looks suspicious

The frontend uses Expo Router:
- runtime entry point: `expo-router/entry`
- route files live in `frontend/app/`

### Run Locally

From the repo root:

```powershell
npm.cmd run check
npm.cmd run app
```

These root commands do:
- `npm run check`: verifies the backend virtual environment, frontend Expo dependencies, and syncs the frontend backend URL to localhost
- `npm run app`: starts backend and frontend together
- `npm run check:frontend:phone`: verifies frontend dependencies only and syncs the frontend backend URL to your LAN IP

If you prefer helper scripts:

Windows PowerShell:

```powershell
.\run_backend.ps1
.\run_frontend.ps1
.\run_app.ps1
```

macOS / Linux / Git Bash:

```bash
./run_backend.sh
./run_frontend.sh
./run_app.sh
```

### Manual Run Commands

Run only the backend:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```

Run only the frontend:

```powershell
cd frontend
npm.cmd start -- --host localhost
```

For the browser:

```powershell
cd frontend
npm.cmd run web
```

If Expo appears stale after a routing change:

```powershell
cd frontend
npm.cmd start -- --clear
```

## Running Automated Tests

### Backend Tests

From the repo root in Windows PowerShell:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m pytest -q
```

Current expected result:
- `33 passed`

To run only the standalone SQLite persistence unit tests:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m pytest -q tests/test_sqlite_persistence.py
```

### Frontend Tests

From the repo root in Windows PowerShell:

```powershell
cd frontend
npm.cmd test
```

These tests verify that:
- the frontend calls the backend API client correctly
- backend responses are mapped into frontend data correctly
- registration and health-profile API flows map correctly
- the routed app UI updates after login, sending a message, and opening history

### Frontend Type Check

From the repo root in Windows PowerShell:

```powershell
cd frontend
npm.cmd run typecheck
```

## Troubleshooting

`expo is not recognized`
- Run `npm.cmd install` in the `frontend` folder first on Windows, or `npm install` on macOS/Linux.

`npm.ps1 cannot be loaded` in PowerShell
- PowerShell is blocking the npm script shim on this machine.
- Use `npm.cmd install`, `npm.cmd start -- --host localhost`, `npm.cmd test`, or `npm.cmd run typecheck`.

`"node" is not recognized`
- Close and reopen the terminal after installing Node.js.
- Make sure Node.js was installed with PATH enabled.
- Check with `node -v` and `npm -v`.

`Network request failed` in Expo
- Make sure the backend is running.
- Make sure `EXPO_PUBLIC_API_URL` points to the correct backend address.
- If you are using a real phone, start the backend on `0.0.0.0`.
- Make sure the phone and computer are on the same network.
- Prefer `npm run check:phone` and `npm run app:phone` for the full local phone workflow.
- Prefer `npm run check:frontend:phone` and `npm run frontend:phone` when the backend is already running in Docker.
- If `npm run check:phone` warns about a suspicious adapter IP, prefer the Wi-Fi interface it reports for phone testing.
- If you previously used phone mode, `frontend/.env` may still point to your LAN IP. Switch it back to `http://127.0.0.1:8000` for same-machine testing if needed.

`Unsupported platform: 312` while installing backend dependencies
- This usually means the wrong Python installation is being used.
- Prefer a standard Python install from `python.org`.
- Python `3.13` is the safest choice for this project.

`docker: command not found`
- Docker Desktop is not installed or not available on PATH.
- Install Docker Desktop and reopen the terminal.

`Bind for 0.0.0.0:8000 failed: port is already allocated`
- Another process is already using port `8000`.
- Stop the local backend or change the published port in `docker-compose.yml`.

`Bind for 0.0.0.0:8080 failed: port is already allocated`
- Another process is already using port `8080`.
- Stop the conflicting process or change the frontend port mapping in `docker-compose.yml`.

`failed to start tunnel`
- Expo tunnel issues are often temporary.
- Try `npm.cmd start -- --host localhost` first on Windows, or `npm start -- --host localhost` on macOS/Linux.
- Use `npm run app:phone` for the normal LAN workflow.

## Project Structure

Key directories:
- `frontend`: Expo / React Native app
- `backend`: FastAPI backend
- `docs/runbooks`: operational runbooks, including Docker setup notes

Key files:
- `frontend/app/`: Expo Router screens and layouts for the mobile/web app
- `frontend/App.tsx`: test wrapper that renders the routed app in Jest
- `frontend/lib/api.ts`: frontend API client
- `frontend/lib/session.tsx`: frontend authentication/session state for routed screens
- `frontend/Dockerfile`: frontend container image definition for the Docker test stack
- `frontend/docker/nginx.conf`: frontend reverse-proxy config for `/api` traffic to the backend container
- `backend/app/main.py`: backend API routes
- `backend/Dockerfile`: backend container image definition
- `docker-compose.yml`: Docker Compose entry for the integrated Docker stack
- `backend/app/assistant_agent.py`: backend assistant reply logic
- `backend/app/services/chatbox/chat_agent.py`: migrated chat-agent service layer
- `backend/app/services/chatbox/extractor_agent.py`: migrated extractor and session report logic
- `backend/app/services/chatbox/state_tracker.py`: migrated coach-state tracker logic

## Current API Notes

- The frontend communicates with the backend through `frontend/lib/api.ts`.
- Authentication routes are `POST /auth/register` and `POST /auth/login`.
- The backend assistant reply route is `POST /conversations/{conversation_id}/assistant-reply`.
- Backend routes are defined in `backend/app/main.py`.
- Conversation and message data are persisted in SQLite instead of the old in-memory store.
- The assistant reply route uses a migrated chat-agent service under `backend/app/services/chatbox/`.
- The backend also runs a migrated extractor/state-tracker flow when assistant replies are generated.
- Session report memory is stored and reused in later assistant replies.
- Conversation, history, coach-state, and session-report routes require a bearer token.
- Debug inspection routes are `GET /conversations/{conversation_id}/coach-state` and `GET /conversations/{conversation_id}/session-reports`.

## Swagger Debug Walkthrough

Use Swagger when you want to inspect backend state directly.

1. Start the backend:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```

2. Open:

```text
http://127.0.0.1:8000/docs
```

3. Register or log in first:
- call `POST /auth/register` or `POST /auth/login`
- copy the returned `access_token`
- click **Authorize** in Swagger and paste `Bearer YOUR_TOKEN`

4. Create a conversation with `POST /conversations`:

```json
{
  "title": "Debug Test Session"
}
```

5. Copy the returned conversation ID, such as `conv-1`.

6. Send a user message with `POST /conversations/{conversation_id}/messages`:

```json
{
  "role": "user",
  "content": "I am too tired after work to exercise."
}
```

7. Generate an assistant reply with `POST /conversations/{conversation_id}/assistant-reply`.

8. Inspect the generated coach state:

```text
GET /conversations/{conversation_id}/coach-state
```

9. Inspect the generated session report memory:

```text
GET /conversations/{conversation_id}/session-reports
```

If those two routes return data after the assistant reply call, then the migrated extractor, state tracker, and session report flow are all working.

## Manual SQLite Persistence Test

Use this test to confirm that conversations and messages stay saved after the backend server restarts.

1. Start the backend:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```

2. Open Swagger at `http://127.0.0.1:8000/docs`.

3. Register or log in and authorize.

4. Create a conversation with:

```json
{
  "title": "SQLite Restart Test"
}
```

5. Add a message with:

```json
{
  "role": "user",
  "content": "This message should still exist after restart."
}
```

6. Confirm the message exists with:

```text
GET /conversations/{conversation_id}/history
```

7. Stop the backend with `Ctrl + C`.

8. Start the backend again:

```powershell
python -m uvicorn app.main:app --reload
```

9. Log in again if needed and confirm:

```text
GET /conversations
GET /conversations/{conversation_id}/history
```

If the conversation and message are still returned after restart, SQLite persistence is working.

## Runbooks

Detailed operational docs:
- `docs/runbooks/docker-stack.md`
- `docs/runbooks/backend-docker.md`
