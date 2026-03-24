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

## Project Structure

Important folders:
- `frontend`: Expo / React Native app
- `backend`: FastAPI backend

Important files:
- `frontend/App.tsx`: main mobile app UI
- `frontend/lib/api.ts`: frontend API client
- `backend/app/main.py`: backend API routes
- `backend/app/assistant_agent.py`: backend assistant reply logic

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
3. Start the backend with `--host 0.0.0.0`.
4. Start the frontend with `npm run start`.
5. Scan the Expo QR code with your phone.

If Expo LAN mode fails on your network, try:

```powershell
npm run start -- --tunnel
```

## Development Login

The current development login is:
- email: `alex@example.com`
- password: `password123`

The backend currently checks the password in code, so `password123` must be used unless that logic is changed.

## Running Automated Tests

## Backend Tests

From the `backend` folder with the virtual environment activated:

```powershell
python -m pytest -q
```

Expected result:
- `13 passed`

## Frontend Tests

From the `frontend` folder:

```powershell
npm test
```

These tests verify that:
- the frontend calls the backend API client correctly
- backend responses are mapped into frontend data correctly
- the app UI updates after login, sending a message, and opening history

## Frontend Type Check

From the `frontend` folder:

```powershell
npm run typecheck
```

This checks the TypeScript code for type errors.

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
