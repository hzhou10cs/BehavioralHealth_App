# BehavioralHealth App

Behavioral health web app with:
- Next.js frontend (`login`, `chat`, `chat-history`) + Jest component tests
- FastAPI backend (auth, conversations, messages, history) + pytest API tests
- Standalone SQLite persistence unit + pytest tests (schema, FK checks, ordered history)

## Runbook Phase 1

### 1) Prerequisites
- Node.js + npm
- Python 3.11+ (tested with 3.13)

### 2) Frontend setup and run
```bash
cd frontend
npm install
npm run dev
```

Open:
- `http://localhost:3000/login`
- `http://localhost:3000/chat`
- `http://localhost:3000/chat-history`

### 3) Backend setup and run
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

### 4) Data storage behavior
- Current FastAPI routes use in-memory store (`app/store.py`) by default.
- SQLite persistence is implemented as standalone unit in `backend/app/sqlite_persistence.py`.
- SQLite unit also supports exporting per-user folder structure:
  - `chats/`
  - `coach_state_tracker/`
  - `session_report/`
  - `goals.json`

## Testing

### Frontend tests (Jest)
```bash
cd frontend
npx jest --runInBand --ci
```

Expected successful output includes:
- `Test Suites: 4 passed, 4 total`
- `Tests: 5 passed, 5 total`

### Backend tests (pytest)
```bash
cd backend
source .venv/Scripts/activate
python -m pytest -q
```

Expected successful output includes:
- `11 passed`

Note:
- A non-blocking pytest cache warning may appear on some Windows environments (`.pytest_cache` permission). Tests can still pass.

## Test Coverage Summary
- Frontend:
  - Login submit flow with mocked API
  - Chat load/send flow with mocked API
  - Chat history rendering with mocked API
  - Reusable component behavior
- Backend FastAPI:
  - Auth success/failure
  - Conversation create/list
  - Message submit/history retrieval
  - 404 behavior for unknown conversation
  - Environment-based settings
- SQLite unit:
  - Schema creation validation
  - Insert/query validation
  - Ordered chat-history retrieval
  - Foreign-key constraint checks
  - Export layout check for health-chat user bundle
