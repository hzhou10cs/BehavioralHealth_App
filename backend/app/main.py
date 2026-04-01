from fastapi import APIRouter, Depends, FastAPI, HTTPException, status

from app.config import Settings, get_settings
from app.schemas import (
    Conversation,
    ConversationCreate,
    LoginRequest,
    LoginResponse,
    Message,
    MessageCreate,
)
from app.store import InMemoryStore

settings = get_settings()
app = FastAPI(title="Behavioral Health API", debug=settings.debug)
router = APIRouter(prefix=settings.api_prefix)
store = InMemoryStore()


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/auth/login", response_model=LoginResponse)
def login(
    payload: LoginRequest, settings: Settings = Depends(get_settings)
) -> LoginResponse:
    if payload.password != "password123":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials"
        )

    user_name = payload.email.split("@", 1)[0]
    return LoginResponse(access_token=settings.auth_token, user_name=user_name)


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
