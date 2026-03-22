import hashlib
import secrets
from json import loads
from pathlib import Path

from fastapi import APIRouter, Depends, FastAPI, Header, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

from app.config import Settings, get_settings
from app.schemas import (
    Conversation,
    ConversationCreate,
    LoginRequest,
    LoginResponse,
    Message,
    MessageCreate,
    SignUpRequest,
    UserProfile,
    UserProfileUpdate,
)
from app.sqlite_persistence import SQLiteHealthChatStore

settings = get_settings()
app = FastAPI(title="Behavioral Health API", debug=settings.debug)
router = APIRouter(prefix=settings.api_prefix)

origins = [item.strip() for item in settings.cors_allow_origins.split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Path(settings.db_path).parent.mkdir(parents=True, exist_ok=True)
store = SQLiteHealthChatStore(settings.db_path)
store.create_schema()


def _hash_password(password: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()


def _parse_password_hash(raw: str | None) -> tuple[str, str] | None:
    if not raw or "$" not in raw:
        return None
    salt, digest = raw.split("$", 1)
    return salt, digest


def _issue_token(user_id: int) -> str:
    return f"user-{user_id}"


def _parse_token(authorization: str | None) -> int:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    token = authorization.split(" ", 1)[1].strip()
    if not token.startswith("user-"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    try:
        return int(token.replace("user-", "", 1))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized") from exc


def _current_user(authorization: str | None = Header(default=None)) -> dict:
    user_id = _parse_token(authorization)
    user = store.get_user_by_id(user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return user


def _profile_from_row(row: dict) -> UserProfile:
    return UserProfile(
        id=int(row["id"]),
        email=row["email"],
        user_name=row.get("user_name") or row["user_key"],
        bio=row.get("bio") or "",
        goals=loads(row.get("goals_json") or "{}"),
        created_at=row["created_at"],
    )


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/auth/signup", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: SignUpRequest) -> LoginResponse:
    existing = store.get_user_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")

    salt = secrets.token_hex(8)
    password_hash = f"{salt}${_hash_password(payload.password, salt)}"
    user_key = payload.email.split("@", 1)[0]
    user_id = store.create_user(
        user_key=user_key,
        email=payload.email,
        password_hash=password_hash,
        user_name=payload.user_name,
    )

    return LoginResponse(
        access_token=_issue_token(user_id),
        user_id=user_id,
        user_name=payload.user_name,
    )


@router.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    user = store.get_user_by_email(payload.email)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    parsed = _parse_password_hash(user.get("password_hash"))
    if parsed is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    salt, digest = parsed
    if _hash_password(payload.password, salt) != digest:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    return LoginResponse(
        access_token=_issue_token(int(user["id"])),
        user_id=int(user["id"]),
        user_name=user.get("user_name") or user["user_key"],
    )


@router.get("/me", response_model=UserProfile)
def get_me(user: dict = Depends(_current_user)) -> UserProfile:
    return _profile_from_row(user)


@router.put("/me", response_model=UserProfile)
def update_me(payload: UserProfileUpdate, user: dict = Depends(_current_user)) -> UserProfile:
    user_id = int(user["id"])
    store.update_user_profile(
        user_id=user_id,
        user_name=payload.user_name,
        bio=payload.bio,
        goals=payload.goals,
    )
    updated = store.get_user_by_id(user_id)
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return _profile_from_row(updated)


@router.post("/conversations", response_model=Conversation, status_code=status.HTTP_201_CREATED)
def create_conversation(
    payload: ConversationCreate, user: dict = Depends(_current_user)
) -> Conversation:
    conversation_id = store.create_conversation(user_id=int(user["id"]), title=payload.title)
    row = store.get_conversation(conversation_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Conversation not created")
    return Conversation(
        id=int(row["id"]),
        title=row["title"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


@router.get("/conversations", response_model=list[Conversation])
def list_conversations(user: dict = Depends(_current_user)) -> list[Conversation]:
    rows = store.list_conversations_for_user(int(user["id"]))
    return [
        Conversation(
            id=int(row["id"]),
            title=row["title"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
        for row in rows
    ]


def _conversation_for_user(conversation_id: int, user_id: int) -> dict:
    conversation = store.get_conversation(conversation_id)
    if conversation is None or int(conversation["user_id"]) != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return conversation


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=Message,
    status_code=status.HTTP_201_CREATED,
)
def submit_message(
    conversation_id: int,
    payload: MessageCreate,
    user: dict = Depends(_current_user),
) -> Message:
    _conversation_for_user(conversation_id, int(user["id"]))
    message_id = store.add_message(
        conversation_id=conversation_id,
        role="user",
        content=payload.content,
    )
    # Demo assistant reply
    store.add_message(
        conversation_id=conversation_id,
        role="assistant",
        content="Thank you for sharing. What would feel most helpful right now?",
    )
    rows = store.get_chat_history(conversation_id)
    created = next(item for item in rows if int(item["id"]) == message_id)

    return Message(
        id=int(created["id"]),
        conversation_id=int(created["conversation_id"]),
        role=created["role"],
        content=created["content"],
        created_at=created["created_at"],
    )


@router.get("/conversations/{conversation_id}/messages", response_model=list[Message])
def get_messages(conversation_id: int, user: dict = Depends(_current_user)) -> list[Message]:
    _conversation_for_user(conversation_id, int(user["id"]))
    rows = store.get_chat_history(conversation_id)
    return [
        Message(
            id=int(item["id"]),
            conversation_id=int(item["conversation_id"]),
            role=item["role"],
            content=item["content"],
            created_at=item["created_at"],
        )
        for item in rows
    ]


@router.get("/conversations/{conversation_id}/history", response_model=list[Message])
def get_history(conversation_id: int, user: dict = Depends(_current_user)) -> list[Message]:
    return get_messages(conversation_id=conversation_id, user=user)


app.include_router(router)
