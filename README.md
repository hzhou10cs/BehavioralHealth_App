# BehavioralHealth App

BehavioralHealth App is a full-stack application built with:
- an Expo / React Native frontend
- a FastAPI backend
- automated backend and frontend tests
- an optional Docker workflow for the backend service

Current capabilities include:
- registering and logging in
- creating and listing conversations
- sending messages
- generating an assistant reply from the backend
- viewing chat history
- navigating between dedicated app screens with Expo Router
- tracking coach state from conversation updates
- generating session report memory for later assistant replies

## Quickstart

Use this section for the fastest path from clone to a running local app.

### Windows PowerShell

1. Set up the backend environment:

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements-dev.txt
cd ..
```

2. Install frontend dependencies:

```powershell
cd frontend
npm install
cd ..
```

3. Start the application from the repository root:

```powershell
npm run check
npm run app
```

4. What to expect:
- the backend starts on `http://127.0.0.1:8000`
- Expo starts in a second process for the frontend
- the app opens to the login screen, then routes to Home, Chat, and History after authentication
- `npm run check` syncs `frontend/.env` to `EXPO_PUBLIC_API_URL=http://127.0.0.1:8000`

5. Open the app:
- if Expo opens in a browser, follow the Expo prompts there
- if you are using **Expo Go** on a phone, scan the QR code only when you are using the phone-specific commands below

6. Register a test account in the app, for example:
- email: `alex@example.com`
- password: `password123`

### Phone Testing With Expo Go

Use this path only when your phone and computer are on the same Wi-Fi network.

1. Install **Expo Go** on your phone.
2. From the repository root, run:

```powershell
npm run check:phone
npm run app:phone
```

3. What these commands do:
- detect your local network IP address
- update `frontend/.env` to use that IP for `EXPO_PUBLIC_API_URL`
- start the backend on `0.0.0.0`
- start Expo in LAN mode

4. Scan the Expo QR code with your phone.

### macOS / Linux / Git Bash

1. Set up the backend environment:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements-dev.txt
cd ..
```

2. Install frontend dependencies:

```bash
cd frontend
npm install
cd ..
```

3. Start the application:

```bash
npm run check
npm run app
```

4. For phone testing with Expo Go:

```bash
npm run check:phone
npm run app:phone
```

If these steps work, the remaining sections cover manual startup, Swagger-based API testing, and troubleshooting.

## Tech Stack
- Frontend: Expo SDK 54, Expo Router, React Native, TypeScript
- Backend: FastAPI, Pydantic, Python
- Tests: `pytest` for the backend, `jest` for the frontend

## Prerequisites

Install the following tools before you begin:
- Node.js LTS
- npm
- Python 3.13 recommended
- Docker Desktop optional for the backend container workflow

Recommended download sources:
- Node.js: `https://nodejs.org/`
- Python: `https://www.python.org/downloads/`
- Docker Desktop: `https://www.docker.com/products/docker-desktop/`

After installation, open a new terminal and confirm the tools are available:

```powershell
node -v
npm -v
py -0
```

On Windows, `py -0` should show a Python version such as `3.13`.

If Windows PowerShell blocks `npm` with an execution-policy error, use
`npm.cmd` instead of `npm` for the same commands in this README.

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
- `backend/app/main.py`: backend API routes
- `backend/Dockerfile`: backend container image definition
- `docker-compose.yml`: Docker Compose entry for the backend container workflow
- `backend/app/assistant_agent.py`: backend assistant reply logic
- `backend/app/services/chatbox/chat_agent.py`: migrated chat-agent service layer
- `backend/app/services/chatbox/extractor_agent.py`: migrated extractor and session report logic
- `backend/app/services/chatbox/state_tracker.py`: migrated coach-state tracker logic

## Backend Setup

These steps create a Python virtual environment and install the backend dependencies.

### Windows PowerShell

```powershell
cd backend
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements-dev.txt
```

### macOS / Linux / Git Bash

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip setuptools wheel
python -m pip install -r requirements-dev.txt
```

Optional: create a local backend `.env` file from the example.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS / Linux / Git Bash:

```bash
cp .env.example .env
```

The backend `.env` file also controls the chat-agent service configuration.
By default, `BHA_ASSISTANT_TEST_MODE=true`, which keeps the assistant in a
safe local stub mode. If you later want to connect a real OpenAI-compatible
LLM service, update the `BHA_ASSISTANT_*` values in `backend/.env`.

### Configure OpenAI Access

To switch the backend from stub mode to OpenAI, update `backend/.env`:

```env
BHA_ASSISTANT_TEST_MODE=false
OPENAI_API_KEY=YOUR_OPENAI_API_KEY
BHA_ASSISTANT_MODEL_NAME=gpt-4.1-mini
```

Optional explicit settings:

```env
BHA_ASSISTANT_LLM_BASE_URL=https://api.openai.com
BHA_ASSISTANT_LLM_API_KEY=YOUR_OPENAI_API_KEY
```

Notes:
- `OPENAI_API_KEY` now works directly in this backend as a convenience alias.
- If you turn test mode off and keep the old stub defaults, the backend will
  automatically switch to `https://api.openai.com` and `gpt-4.1-mini`.
- You can still point `BHA_ASSISTANT_LLM_BASE_URL` at any other
  OpenAI-compatible service if you want.

The backend stores users, conversations, and messages in SQLite. By default,
the database file path is controlled by `BHA_SQLITE_DB_PATH` and points to
`data/behavioral_health.sqlite3` inside the `backend` folder.

## Frontend Setup

Install the frontend dependencies from the `frontend` folder:

```powershell
cd frontend
npm install
```

Next, create a frontend `.env` file from the example if you want to manage it manually:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS / Linux / Git Bash:

```bash
cp .env.example .env
```

If you use `npm run check`, `npm run frontend`, or `npm run app`, the root tooling will keep `frontend/.env` in sync with localhost mode. If the file is missing, it will be created automatically.

If you use `npm run check:phone`, `npm run frontend:phone`, or `npm run app:phone`, the root tooling will sync `frontend/.env` to your current LAN IP for phone testing.

The frontend now uses Expo Router. The runtime entry point is `expo-router/entry`, and the route files live under `frontend/app/`.

## Docker Workflow

The repository now includes an initial Docker workflow for the backend service.

Current scope:
- Docker currently covers the FastAPI backend and persisted SQLite data
- the Expo frontend still runs locally on your machine
- the backend Docker setup is defined in `backend/Dockerfile` and `docker-compose.yml`

If you want to run the backend with Docker instead of a local Python virtual environment:

```powershell
docker compose up --build
```

Expected result:
- the backend starts on `http://127.0.0.1:8000`
- the backend database persists in the Docker volume `backend_data`

To stop the backend container:

```powershell
docker compose down
```

To remove the persisted Docker database volume too:

```powershell
docker compose down -v
```

The detailed Docker runbook is here:
- `docs/runbooks/backend-docker.md`

## Run The Backend

Start the backend from the `backend` folder.

### For local browser testing on the same computer

```powershell
python -m uvicorn app.main:app --reload
```

### For testing from a real phone on the same Wi-Fi network

```powershell
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Docker option for the backend

From the repository root:

```powershell
docker compose up --build
```

This runs the backend in a container on port `8000` with persisted SQLite storage.

When the backend is running, open:

- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/docs`

What these are:
- `/health` is a quick check that the backend is alive
- `/docs` is the built-in Swagger page for testing the API in a browser

### Quick OpenAI Smoke Test In Swagger

Once the backend is running with `BHA_ASSISTANT_TEST_MODE=false`:

1. Open `http://127.0.0.1:8000/docs`.
2. Register or log in first:

- Call `POST /auth/register` or `POST /auth/login`
- Copy the returned `access_token`
- Click **Authorize** in Swagger and paste `Bearer YOUR_TOKEN`

3. Call `POST /conversations` with:

```json
{
  "title": "OpenAI Test"
}
```

4. Copy the returned conversation ID.
5. Call `POST /conversations/{conversation_id}/messages` with:

```json
{
  "role": "user",
  "content": "I have been feeling overwhelmed after work and I do not know where to start."
}
```

6. Call `POST /conversations/{conversation_id}/assistant-reply`.

If the response is a real model reply instead of the built-in stub message that
starts with `Thanks for sharing that. I hear you saying`, then the OpenAI
integration is working.

## Quick Start Commands

After you finish backend setup and frontend setup, the easiest way to run the app is from the repo root.

There are no root dependencies to install. The root `package.json` only provides helper commands.

```powershell
npm run check
npm run app
```

For phone testing on the same Wi-Fi:

```powershell
npm run check:phone
npm run app:phone
```

What these root commands do:
- `npm run check`: verifies the backend virtual environment, frontend Expo dependencies, and syncs the frontend backend URL to localhost
- `npm run app`: starts backend and frontend together
- `npm run check:phone`: syncs `frontend/.env` to your current LAN IP and validates phone-mode prerequisites
- `npm run app:phone`: starts backend on `0.0.0.0`, switches Expo to LAN mode, and uses the phone-mode API URL

If you switch back and forth between same-computer testing and phone testing:
- `npm run check` resets `frontend/.env` to localhost mode
- `npm run check:phone` updates `frontend/.env` to your current local IP
- to force same-computer localhost mode again, edit `frontend/.env` so `EXPO_PUBLIC_API_URL=http://127.0.0.1:8000`

You can still use the helper scripts if you prefer:

### Windows PowerShell

```powershell
.\run_backend.ps1
.\run_frontend.ps1
.\run_app.ps1
```

For phone testing:

```powershell
.\run_backend.ps1 -Phone
.\run_frontend.ps1 -Phone
.\run_app.ps1 -Phone
```

### macOS / Linux / Git Bash

```bash
./run_backend.sh
./run_frontend.sh
./run_app.sh
```

For phone testing:

```bash
./run_backend.sh --phone
./run_frontend.sh --phone
./run_app.sh --phone
```

## Configure The Frontend Backend URL

The frontend needs to know where your FastAPI backend is running.

Edit `frontend/.env`.

### If you are using a browser or simulator on the same computer

```env
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000
```

### If you are using a real phone

Use your computer's local IPv4 address instead:

```env
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:8000
```

On Windows, you can find your local IP with:

```powershell
ipconfig
```

Look for the active adapter and copy the `IPv4 Address`, then put that value in `frontend/.env`.

## Run The Frontend

From the `frontend` folder:

```powershell
npm start -- --host localhost
```

This starts Expo. Keep that terminal open while you use the app.

For web in the browser:

```powershell
npm run web
```

If Expo appears to cache an older entrypoint after a routing change, clear the cache once:

```powershell
npm start -- --clear
```

### Test On A Real Phone

1. Make sure your phone and computer are on the same Wi-Fi network.
2. Install **Expo Go** on your phone.
3. From the repo root, run:

```powershell
npm run check:phone
npm run app:phone
```

4. Scan the Expo QR code with your phone.

If Expo LAN mode fails on your network, try:

```powershell
npm start -- --tunnel
```

## Development Accounts

The app now supports account registration and login.

Example test account:
- email: `alex@example.com`
- password: `password123`

You can also register a second account to verify user isolation.

## Running Automated Tests

### Backend Tests

From the repo root in Windows PowerShell:

```powershell
npm run check
cd backend
.\.venv\Scripts\Activate.ps1
python -m pytest -q
```

Current expected result:
- `29 passed`

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
npm test
```

These tests verify that:
- the frontend calls the backend API client correctly
- backend responses are mapped into frontend data correctly
- the routed app UI updates after login, sending a message, and opening history

### Frontend Type Check

From the repo root in Windows PowerShell:

```powershell
cd frontend
npm run typecheck
```

This checks the TypeScript code for type errors.

## Manual SQLite Persistence Test

Use this test to confirm that conversations and messages stay saved after the
backend server restarts.

1. Start the backend from the `backend` folder:

```powershell
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
```

2. Open Swagger:

```text
http://127.0.0.1:8000/docs
```

3. Register or log in first:

- Call `POST /auth/register` or `POST /auth/login`
- Copy the returned `access_token`
- Click **Authorize** in Swagger and paste `Bearer YOUR_TOKEN`

4. Create a conversation with `POST /conversations`:

```json
{
  "title": "SQLite Restart Test"
}
```

5. Copy the returned conversation ID, such as `conv-1`.

6. Add a message with `POST /conversations/{conversation_id}/messages`:

```json
{
  "role": "user",
  "content": "This message should still exist after restart."
}
```

7. Confirm the message exists before restart with:

```text
GET /conversations/{conversation_id}/history
```

8. Stop the backend with `Ctrl + C`.

9. Start the backend again:

```powershell
python -m uvicorn app.main:app --reload
```

10. Reopen Swagger, log in again if needed, click **Authorize**, and check:

```text
GET /conversations
GET /conversations/{conversation_id}/history
```

If the conversation and message are still returned after restarting the server,
then SQLite persistence is working correctly.

## Recommended Order For First-Time Setup

If you are new to this stack, use this order:

1. Install Node.js and Python.
2. Set up the backend virtual environment.
3. Install backend dependencies.
4. Install frontend dependencies.
5. Run `npm run check`.
6. Run `npm run app`.
7. Register a test account and send a message.
8. Run `python -m pytest -q`.
9. Run `npm test`.

## Troubleshooting

`expo is not recognized`
- Run `npm install` in the `frontend` folder first.

`npm.ps1 cannot be loaded` in PowerShell
- PowerShell is blocking the npm script shim on this machine.
- Use `npm.cmd install`, `npm.cmd start -- --host localhost`, `npm.cmd test`, or `npm.cmd run typecheck`.

`"node" is not recognized` when running `npm test` or `npm run typecheck`
- Close and reopen the terminal after installing Node.js.
- Make sure Node.js was installed with PATH enabled.
- Check with `node -v` and `npm -v`.

`Network request failed` in Expo
- Make sure the backend is running.
- Make sure `EXPO_PUBLIC_API_URL` points to the correct backend address.
- If you are using a real phone, start Uvicorn with `--host 0.0.0.0`.
- Make sure the phone and computer are on the same network.
- Prefer `npm run check:phone` and `npm run app:phone` so the frontend URL is synced automatically.
- If you previously used phone mode, `frontend/.env` may still point to your LAN IP. That is fine on the same network, but if needed you can switch it back to `http://127.0.0.1:8000`.

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

`failed to start tunnel`
- Expo tunnel issues are often temporary.
- Try `npm start -- --host localhost` first, or use `npm run app:phone` for the LAN workflow.

## Current API Notes

- The frontend communicates with the backend through `frontend/lib/api.ts`.
- Authentication routes are `POST /auth/register` and `POST /auth/login`.
- The backend assistant reply route is `POST /conversations/{conversation_id}/assistant-reply`.
- Backend routes are defined in `backend/app/main.py`.
- Conversation and message data are persisted in SQLite instead of the old in-memory store.
- The assistant reply route now uses a migrated chat-agent service under `backend/app/services/chatbox/`.
- The backend also runs a migrated extractor/state-tracker flow when assistant replies are generated.
- Session report memory is now stored and reused in later assistant replies.
- Conversation, history, coach-state, and session-report routes require a bearer token.
- Debug inspection routes are also available:
  - `GET /conversations/{conversation_id}/coach-state`
  - `GET /conversations/{conversation_id}/session-reports`

## Swagger Debug Walkthrough

You can inspect the migrated backend state directly in Swagger.

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

- Call `POST /auth/register` or `POST /auth/login`
- Copy the returned `access_token`
- Click **Authorize** in Swagger and paste `Bearer YOUR_TOKEN`

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

### Inspect State After Sending A Message In Expo

If you send a message from the mobile app in Expo and want to inspect what the backend stored:

1. Keep the backend running.
2. Open Swagger:

```text
http://127.0.0.1:8000/docs
```

3. Log in with the same account you used in the mobile app:

- Call `POST /auth/login`
- Copy the returned `access_token`
- Click **Authorize** in Swagger and paste `Bearer YOUR_TOKEN`

4. Call:

```text
GET /conversations
```

5. Find the most recent conversation ID, for example `conv-3`.

6. Use that ID in:

```text
GET /conversations/{conversation_id}/coach-state
GET /conversations/{conversation_id}/session-reports
```

These routes let you inspect:
- the current structured coach state built from the conversation
- the saved session report memory generated from the conversation
