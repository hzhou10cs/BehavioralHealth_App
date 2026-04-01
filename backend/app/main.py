import hashlib
import hmac
import logging
import secrets
from dataclasses import dataclass

from fastapi import APIRouter, Depends, FastAPI, HTTPException, status

from app.config import Settings, get_settings
from app.schemas import (
    Conversation,
    ConversationCreate,
    LoginRequest,
    LoginResponse,
    Message,
    MessageCreate,
    RegisterRequest,
)
from app.store import InMemoryStore

settings = get_settings()
app = FastAPI(title="Behavioral Health API", debug=settings.debug)
router = APIRouter(prefix=settings.api_prefix)
store = InMemoryStore()
logger = logging.getLogger("behavioral_health.auth")


@dataclass
class UserAccount:
    email: str
    user_name: str
    password_salt: str
    password_hash: str


class InMemoryAuthStore:
    def __init__(self) -> None:
        self._users_by_email: dict[str, UserAccount] = {}
        self._seed_demo_account()

    def reset(self) -> None:
        self._users_by_email = {}
        self._seed_demo_account()

    def _seed_demo_account(self) -> None:
        self.register(
            email="demo@health.app",
            user_name="demo",
            password="password123",
        )

    def register(self, email: str, user_name: str, password: str) -> UserAccount:
        normalized_email = email.strip().lower()
        if normalized_email in self._users_by_email:
            raise ValueError("Email already registered")

        salt = secrets.token_hex(16)
        password_hash = self._hash_password(password=password, salt=salt)
        account = UserAccount(
            email=normalized_email,
            user_name=user_name.strip(),
            password_salt=salt,
            password_hash=password_hash,
        )
        self._users_by_email[normalized_email] = account
        return account

    def authenticate(self, email: str, password: str) -> UserAccount | None:
        normalized_email = email.strip().lower()
        account = self._users_by_email.get(normalized_email)
        if account is None:
            return None
        expected_hash = self._hash_password(password=password, salt=account.password_salt)
        if not hmac.compare_digest(account.password_hash, expected_hash):
            return None
        return account

    def _hash_password(self, password: str, salt: str) -> str:
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            120_000,
        )
        return digest.hex()


auth_store = InMemoryAuthStore()


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/auth/login", response_model=LoginResponse)
def login(
    payload: LoginRequest, settings: Settings = Depends(get_settings)
) -> LoginResponse:
    normalized_email = payload.email.strip().lower()
    account = auth_store.authenticate(payload.email, payload.password)
    if account is not None:
        logger.info("Login success for registered account: email=%s", normalized_email)
        return LoginResponse(access_token=settings.auth_token, user_name=account.user_name)

    logger.warning("Login failed: email=%s", normalized_email)
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
    )


@router.post("/auth/register", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest, settings: Settings = Depends(get_settings)
) -> LoginResponse:
    normalized_email = payload.email.strip().lower()
    try:
        account = auth_store.register(
            email=payload.email,
            user_name=payload.user_name,
            password=payload.password,
        )
    except ValueError as exc:
        logger.warning(
            "Register failed: email=%s reason=%s",
            normalized_email,
            str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc

    logger.info("Register success: email=%s user_name=%s", normalized_email, account.user_name)
    return LoginResponse(access_token=settings.auth_token, user_name=account.user_name)


@router.post("/auth/signup", response_model=LoginResponse, status_code=status.HTTP_201_CREATED)
def signup(
    payload: RegisterRequest, settings: Settings = Depends(get_settings)
) -> LoginResponse:
    return register(payload=payload, settings=settings)


@router.post(
    "/conversations", response_model=Conversation, status_code=status.HTTP_201_CREATED
)
def create_conversation(payload: ConversationCreate) -> Conversation:
    return store.create_conversation(title=payload.title)


@router.get("/conversations", response_model=list[Conversation])
def list_conversations() -> list[Conversation]:
    return store.list_conversations()


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=Message,
    status_code=status.HTTP_201_CREATED,
)
def submit_message(conversation_id: str, payload: MessageCreate) -> Message:
    if not store.has_conversation(conversation_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return store.add_message(
        conversation_id=conversation_id, role=payload.role, content=payload.content
    )


@router.get("/conversations/{conversation_id}/messages", response_model=list[Message])
def get_messages(conversation_id: str) -> list[Message]:
    if not store.has_conversation(conversation_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return store.get_messages(conversation_id)


@router.get("/conversations/{conversation_id}/history", response_model=list[Message])
def get_history(conversation_id: str) -> list[Message]:
    if not store.has_conversation(conversation_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return store.get_messages(conversation_id)


app.include_router(router)
