# BehavioralHealth App

BehavioralHealth App is a small full-stack project with:
- an Expo / React Native frontend
- a FastAPI backend
- automated tests for the backend and frontend

The app currently supports:
- login
- creating and listing conversations
- sending messages
- generating an assistant reply from the backend
- viewing chat history
- tracking coach state from conversation updates
- generating session report memory for later assistant replies

## Tech Stack
- Frontend: Expo SDK 54, React Native, TypeScript
- Backend: FastAPI, Pydantic, Python
- Tests: `pytest` for the backend, `jest` for the frontend

## What You Need Before You Start

Install these tools first:
- Node.js LTS
- npm
- Python 3.13 recommended

Recommended sources:
- Node.js: `https://nodejs.org/`
- Python: `https://www.python.org/downloads/`

After installing, open a new terminal and check that the tools work:

```powershell
node -v
npm -v
py -0
```

On Windows, `py -0` should show a Python version such as `3.13`.

If Windows PowerShell blocks `npm` with an execution-policy error, use
`npm.cmd` instead of `npm` for the same commands in this README.

## Project Structure

Important folders:
- `frontend`: Expo / React Native app
- `backend`: FastAPI backend

Important files:
- `frontend/App.tsx`: main mobile app UI
- `frontend/lib/api.ts`: frontend API client
- `backend/app/main.py`: backend API routes
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

Optional: create a local backend `.env` file from the example file.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS / Linux / Git Bash:

```bash
cp .env.example .env
```

The backend `.env` file also controls the migrated chat-agent service.
By default, `BHA_ASSISTANT_TEST_MODE=true`, which keeps the assistant in a
safe local stub mode. If you later want to connect a real OpenAI-compatible
LLM service, update the `BHA_ASSISTANT_*` values in `backend/.env`.

### Test With Your OpenAI API Key

To switch this backend from stub mode to OpenAI, update `backend/.env`:

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

The backend now stores users, conversations, and messages in SQLite. By
default, the database file path is controlled by `BHA_SQLITE_DB_PATH` and
points to `data/behavioral_health.sqlite3` inside the `backend` folder.

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

When the backend is running, open:

- `http://127.0.0.1:8000/health`
- `http://127.0.0.1:8000/docs`

What these are:
- `/health` is a quick check that the backend is alive
- `/docs` is the built-in Swagger page for testing the API in a browser

### Quick OpenAI Smoke Test In Swagger

Once the backend is running with `BHA_ASSISTANT_TEST_MODE=false`:

1. Open `http://127.0.0.1:8000/docs`.
2. Call `POST /conversations` with:

```json
{
  "title": "OpenAI Test"
}
```

3. Copy the returned conversation ID.
4. Call `POST /conversations/{conversation_id}/messages` with:

```json
{
  "role": "user",
  "content": "I have been feeling overwhelmed after work and I do not know where to start."
}
```

5. Call `POST /conversations/{conversation_id}/assistant-reply`.

If the response is a real model reply instead of the built-in stub message that
starts with `Thanks for sharing that. I hear you saying`, then the OpenAI
integration is working.

## Frontend Setup

Install the frontend dependencies from the `frontend` folder:

```powershell
cd frontend
npm install
```

Next, create a frontend `.env` file from the example:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS / Linux / Git Bash:

```bash
cp .env.example .env
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

Look for the active adapter and copy the `IPv4 Address`.

Example:

```env
EXPO_PUBLIC_API_URL=http://10.0.0.185:8000
```

## Run The Frontend

From the `frontend` folder:

```powershell
npm run start
```

This starts Expo. Keep that terminal open while you use the app.

### Test On A Real Phone

1. Make sure your phone and computer are on the same Wi-Fi network.
2. Install **Expo Go** on your phone.
3. Start the backend in PowerShell:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

4. In a second PowerShell window, start the frontend:

```powershell
cd frontend
npm run start
```

5. Scan the Expo QR code with your phone.

If Expo LAN mode fails on your network, try:

```powershell
npm run start -- --tunnel
```

## Development Login

Example development login to use in the app:
- email: `alex@example.com`
- password: `password123`

The backend currently accepts any email address and only checks the password in
code. The part of the email before `@` is used as the displayed username. That
means `password123` must be used unless the login logic is changed.

## Running Automated Tests

### Backend Tests

From the repo root in Windows PowerShell:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python -m pytest -q
```

Current expected result:
- `23 passed`

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
- the app UI updates after login, sending a message, and opening history

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

3. Create a conversation with `POST /conversations`:

```json
{
  "title": "SQLite Restart Test"
}
```

4. Copy the returned conversation ID, such as `conv-1`.

5. Add a message with `POST /conversations/{conversation_id}/messages`:

```json
{
  "role": "user",
  "content": "This message should still exist after restart."
}
```

6. Confirm the message exists before restart with:

```text
GET /conversations/{conversation_id}/history
```

7. Stop the backend with `Ctrl + C`.

8. Start the backend again:

```powershell
python -m uvicorn app.main:app --reload
```

9. Reopen Swagger and check:

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
4. Run the backend and open `/health`.
5. Install frontend dependencies.
6. Create `frontend/.env`.
7. Start Expo.
8. Log in with the development credentials.
9. Run `python -m pytest -q`.
10. Run `npm test`.

## Troubleshooting

`expo is not recognized`
- Run `npm install` in the `frontend` folder first.

`npm.ps1 cannot be loaded` in PowerShell
- PowerShell is blocking the npm script shim on this machine.
- Use `npm.cmd install`, `npm.cmd run start`, `npm.cmd test`, or `npm.cmd run typecheck`.

`"node" is not recognized` when running `npm test` or `npm run typecheck`
- Close and reopen the terminal after installing Node.js.
- Make sure Node.js was installed with PATH enabled.
- Check with `node -v` and `npm -v`.

`Network request failed` in Expo
- Make sure the backend is running.
- Make sure `EXPO_PUBLIC_API_URL` points to the correct backend address.
- If you are using a real phone, start Uvicorn with `--host 0.0.0.0`.
- Make sure the phone and computer are on the same network.

`Unsupported platform: 312` while installing backend dependencies
- This usually means the wrong Python installation is being used.
- Prefer a standard Python install from `python.org`.
- Python `3.13` is the safest choice for this project.

`failed to start tunnel`
- Expo tunnel issues are often temporary.
- Try `npm run start` first and use LAN mode.

## Current API Notes

- The frontend communicates with the backend through `frontend/lib/api.ts`.
- The backend assistant reply route is `POST /conversations/{conversation_id}/assistant-reply`.
- Backend routes are defined in `backend/app/main.py`.
- Conversation and message data are persisted in SQLite instead of the old in-memory store.
- The assistant reply route now uses a migrated chat-agent service under `backend/app/services/chatbox/`.
- The backend also runs a migrated extractor/state-tracker flow when assistant replies are generated.
- Session report memory is now stored and reused in later assistant replies.
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

3. Create a conversation with `POST /conversations`:

```json
{
  "title": "Debug Test Session"
}
```

4. Copy the returned conversation ID, such as `conv-1`.

5. Send a user message with `POST /conversations/{conversation_id}/messages`:

```json
{
  "role": "user",
  "content": "I am too tired after work to exercise."
}
```

6. Generate an assistant reply with `POST /conversations/{conversation_id}/assistant-reply`.

7. Inspect the generated coach state:

```text
GET /conversations/{conversation_id}/coach-state
```

8. Inspect the generated session report memory:

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

3. Call:

```text
GET /conversations
```

4. Find the most recent conversation ID, for example `conv-3`.

5. Use that ID in:

```text
GET /conversations/{conversation_id}/coach-state
GET /conversations/{conversation_id}/session-reports
```

These routes let you inspect:
- the current structured coach state built from the conversation
- the saved session report memory generated from the conversation
