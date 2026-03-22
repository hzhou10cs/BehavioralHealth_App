# BehavioralHealth App

Behavioral health mobile demo with:
- Expo SDK 54 + React Native frontend
- FastAPI backend with SQLite persistence
- Demo flow: **Sign Up** -> **Log In** -> **Home** -> separate pages for **Chat**, **Chat History**, and **Profile Update**

## Prerequisites
- Node.js LTS (recommended: 20.x)
- npm
- Python 3.11+
- iPhone with Expo Go installed

## Backend Setup (SQLite + API)
```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
cp .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Edit `backend/.env` if needed:
- `BHA_DB_PATH` controls where SQLite is stored.
- `BHA_CORS_ALLOW_ORIGINS` can be set to your frontend origin(s).

Health endpoint:
- `http://127.0.0.1:8000/health`

### How data is stored
- Runtime backend storage is SQLite via `backend/app/sqlite_persistence.py`.
- Default DB file path: `backend_local_tmp/app_demo.sqlite3` (configurable via `BHA_DB_PATH`).
- Main tables:
  - `users` (email, password hash, user profile fields, goals JSON)
  - `conversations` (per-user conversations)
  - `messages` (chat messages by conversation)
  - `coach_state_tracker`, `session_reports` (existing support tables)

## Frontend Setup (Expo)
```bash
cd frontend
npm install
```

Set backend URL for mobile device access (replace with your Windows machine LAN IP):
```bash
# Example IP: 192.168.1.25
export EXPO_PUBLIC_API_BASE_URL="http://192.168.1.25:8000"
```

Start Expo:
```bash
npx expo start -c --tunnel
```

Open Expo Go on iPhone and scan the QR.

## Demo User Flow
1. Sign up on **Create Account** page.
2. Log in on **Log In** page.
3. From **Home**, open:
   - **Chat**: send messages and receive demo assistant replies.
   - **Chat History**: view stored conversations.
   - **Update Profile**: edit name, bio, and goals.

## Backend Tests
```bash
cd backend
source .venv/Scripts/activate
python -m pytest -q
```

Current expected result:
- `12 passed`

## Quick Test Commands
```bash
# Terminal 1 - backend
cd backend
source .venv/Scripts/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

```bash
# Terminal 2 - frontend
cd frontend
export EXPO_PUBLIC_API_BASE_URL="http://<YOUR_WINDOWS_LAN_IP>:8000"
npx expo start -c --tunnel
```
