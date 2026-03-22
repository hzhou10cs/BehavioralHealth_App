# BehavioralHealth App

Behavioral health app with:
- Expo SDK 54 + React Native frontend (`login`, `chat`, `chat-history`) for Android and iOS
- FastAPI backend (auth, conversations, messages, history)
- Standalone SQLite persistence unit + pytest tests (schema, FK checks, ordered history)

## Prerequisites
- Node.js LTS (recommended: 20.x)
- npm
- Python 3.11+ (backend tested with 3.13)
- iPhone with **Expo Go** installed

## Frontend Setup (Expo)
```bash
cd frontend
npm install
npm run start
```

When Expo starts, keep the terminal running.

### Test On iPhone (Windows development machine)
1. Make sure your Windows machine and iPhone have internet access.
2. Install **Expo Go** from the iOS App Store.
3. In `frontend`, run:
```bash
npm run start -- --tunnel
```
4. In the Expo terminal UI, scan the QR code with your iPhone Camera (or from Expo Go).
5. The app opens in Expo Go. You can switch between **Login**, **Chat**, and **History** using the top tabs.

Notes:
- `--tunnel` is the most reliable option from Windows to iPhone when local LAN discovery is flaky.
- Default demo login password is `password123`.

## Backend Setup and Run
```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
uvicorn app.main:app --reload
```

Health endpoint:
- `http://127.0.0.1:8000/health`

## Backend Testing
```bash
cd backend
source .venv/Scripts/activate
python -m pytest -q
```

Expected successful output includes:
- `11 passed`

## Project Notes
- The mobile frontend currently uses a local mock data layer in `frontend/lib/api.ts` for login/messages/history flows.
- Backend API implementation remains available in `backend/app/main.py`.
