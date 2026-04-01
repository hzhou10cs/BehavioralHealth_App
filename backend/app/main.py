import logging

from fastapi import APIRouter, Depends, FastAPI, HTTPException, status

from app.auth_store import InMemoryAuthStore
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
