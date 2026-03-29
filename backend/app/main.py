import sqlite3

from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.assistant_agent import (
    build_assistant_memory,
    build_extractor_agent,
    generate_assistant_reply,
)
from app.auth import create_access_token, hash_password, verify_access_token, verify_password
from app.config import Settings, get_settings
from app.schemas import (
    CoachStateResponse,
    Conversation,
    ConversationCreate,
    LoginRequest,
    LoginResponse,
    Message,
    MessageCreate,
    RegisterRequest,
    SessionReportsResponse,
)
from app.services.chatbox.state_tracker import apply_delta_text, state_to_text
from app.store import build_store

settings = get_settings()
app = FastAPI(title="Behavioral Health API", debug=settings.debug)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
router = APIRouter(prefix=settings.api_prefix)
store = build_store(settings)
bearer_scheme = HTTPBearer(auto_error=False)


def _auth_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_account(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> dict:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _auth_error()

    try:
        payload = verify_access_token(
            credentials.credentials, secret_key=settings.auth_secret_key
        )
    except ValueError as exc:
        raise _auth_error() from exc

    account = store.get_auth_user_by_id(int(payload["auth_user_id"]))
    if account is None:
        raise _auth_error()
    if int(account["user_id"]) != int(payload["user_id"]):
        raise _auth_error()
    if str(account["email"]).lower() != str(payload["email"]).lower():
        raise _auth_error()
    return account


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/auth/login", response_model=LoginResponse)
def login(
    payload: LoginRequest, settings: Settings = Depends(get_settings)
) -> LoginResponse:
    email = str(payload.email).lower()
    account = store.get_auth_user_by_email(email)
    if account is None or not verify_password(
        payload.password,
        account["password_salt"],
        account["password_hash"],
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    user_name = email.split("@", 1)[0]
    return LoginResponse(
        access_token=create_access_token(
            auth_user_id=int(account["id"]),
            user_id=int(account["user_id"]),
            email=email,
            secret_key=settings.auth_secret_key,
        ),
        user_name=user_name,
    )


@router.post(
    "/auth/register",
    response_model=LoginResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    payload: RegisterRequest, settings: Settings = Depends(get_settings)
) -> LoginResponse:
    email = str(payload.email).lower()
    salt, password_hash = hash_password(payload.password)

    try:
        auth_user_id = store.create_auth_user(
            email=email,
            password_salt=salt,
            password_hash=password_hash,
        )
    except sqlite3.IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        ) from exc

    user_name = email.split("@", 1)[0]
    account = store.get_auth_user_by_id(auth_user_id)
    if account is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Account registration failed",
        )
    return LoginResponse(
        access_token=create_access_token(
            auth_user_id=int(account["id"]),
            user_id=int(account["user_id"]),
            email=email,
            secret_key=settings.auth_secret_key,
        ),
        user_name=user_name,
    )


@router.post(
    "/conversations", response_model=Conversation, status_code=status.HTTP_201_CREATED
)
def create_conversation(
    payload: ConversationCreate, current_account: dict = Depends(get_current_account)
) -> Conversation:
    return store.create_conversation(
        title=payload.title, user_id=int(current_account["user_id"])
    )


@router.get("/conversations", response_model=list[Conversation])
def list_conversations(
    current_account: dict = Depends(get_current_account),
) -> list[Conversation]:
    return store.list_conversations(user_id=int(current_account["user_id"]))


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=Message,
    status_code=status.HTTP_201_CREATED,
)
def submit_message(
    conversation_id: str,
    payload: MessageCreate,
    current_account: dict = Depends(get_current_account),
) -> Message:
    user_id = int(current_account["user_id"])
    if not store.has_conversation(conversation_id, user_id=user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return store.add_message(
        conversation_id=conversation_id,
        role=payload.role,
        content=payload.content,
        user_id=user_id,
    )


@router.get("/conversations/{conversation_id}/messages", response_model=list[Message])
def get_messages(
    conversation_id: str, current_account: dict = Depends(get_current_account)
) -> list[Message]:
    user_id = int(current_account["user_id"])
    if not store.has_conversation(conversation_id, user_id=user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return store.get_messages(conversation_id, user_id=user_id)


@router.get("/conversations/{conversation_id}/history", response_model=list[Message])
def get_history(
    conversation_id: str, current_account: dict = Depends(get_current_account)
) -> list[Message]:
    user_id = int(current_account["user_id"])
    if not store.has_conversation(conversation_id, user_id=user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return store.get_messages(conversation_id, user_id=user_id)


@router.get(
    "/conversations/{conversation_id}/coach-state",
    response_model=CoachStateResponse,
)
def get_coach_state(
    conversation_id: str, current_account: dict = Depends(get_current_account)
) -> CoachStateResponse:
    user_id = int(current_account["user_id"])
    if not store.has_conversation(conversation_id, user_id=user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return CoachStateResponse(
        conversation_id=conversation_id,
        coach_state=store.get_coach_state(conversation_id, user_id=user_id),
    )


@router.get(
    "/conversations/{conversation_id}/session-reports",
    response_model=SessionReportsResponse,
)
def get_session_reports(
    conversation_id: str, current_account: dict = Depends(get_current_account)
) -> SessionReportsResponse:
    user_id = int(current_account["user_id"])
    if not store.has_conversation(conversation_id, user_id=user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return SessionReportsResponse(
        conversation_id=conversation_id,
        session_reports=store.list_session_reports(conversation_id, user_id=user_id),
    )


@router.post(
    "/conversations/{conversation_id}/assistant-reply",
    response_model=Message,
    status_code=status.HTTP_201_CREATED,
)
def create_assistant_reply(
    conversation_id: str, current_account: dict = Depends(get_current_account)
) -> Message:
    user_id = int(current_account["user_id"])
    if not store.has_conversation(conversation_id, user_id=user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    history = store.get_messages(conversation_id, user_id=user_id)
    latest_user_message = next(
        (message for message in reversed(history) if message.role == "user"),
        None,
    )
    previous_assistant_message = next(
        (message for message in reversed(history) if message.role == "assistant"),
        None,
    )

    extractor = build_extractor_agent()
    delta_text = extractor.extract_summary_json(
        previous_assistant_message.content if previous_assistant_message else None,
        latest_user_message.content if latest_user_message else "",
    )
    updated_coach_state = apply_delta_text(
        store.get_coach_state(conversation_id, user_id=user_id),
        delta_text,
    )
    store.save_coach_state(conversation_id, updated_coach_state, user_id=user_id)

    memory_text = build_assistant_memory(
        latest_session_report=store.get_latest_session_report(
            conversation_id, user_id=user_id
        ),
        coach_state_text=state_to_text(updated_coach_state),
    )

    reply = generate_assistant_reply(history, memory_text=memory_text)
    created_reply = store.add_message(
        conversation_id=conversation_id,
        role="assistant",
        content=reply,
        user_id=user_id,
    )
    report = extractor.generate_session_report(
        [
            {
                "role": message.role,
                "content": message.content,
            }
            for message in store.get_messages(conversation_id, user_id=user_id)
        ],
        session_label=conversation_id,
    )
    store.add_session_report(conversation_id, report, user_id=user_id)
    return created_reply


app.include_router(router)
