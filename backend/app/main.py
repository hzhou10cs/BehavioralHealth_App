from fastapi import APIRouter, Depends, FastAPI, HTTPException, status

from app.assistant_agent import (
    build_assistant_memory,
    build_extractor_agent,
    generate_assistant_reply,
)
from app.config import Settings, get_settings
from app.schemas import (
    CoachStateResponse,
    Conversation,
    ConversationCreate,
    LoginRequest,
    LoginResponse,
    Message,
    MessageCreate,
    SessionReportsResponse,
)
from app.services.chatbox.state_tracker import apply_delta_text, state_to_text
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


@router.get(
    "/conversations/{conversation_id}/coach-state",
    response_model=CoachStateResponse,
)
def get_coach_state(conversation_id: str) -> CoachStateResponse:
    if not store.has_conversation(conversation_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return CoachStateResponse(
        conversation_id=conversation_id,
        coach_state=store.get_coach_state(conversation_id),
    )


@router.get(
    "/conversations/{conversation_id}/session-reports",
    response_model=SessionReportsResponse,
)
def get_session_reports(conversation_id: str) -> SessionReportsResponse:
    if not store.has_conversation(conversation_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return SessionReportsResponse(
        conversation_id=conversation_id,
        session_reports=store.list_session_reports(conversation_id),
    )


@router.post(
    "/conversations/{conversation_id}/assistant-reply",
    response_model=Message,
    status_code=status.HTTP_201_CREATED,
)
def create_assistant_reply(conversation_id: str) -> Message:
    if not store.has_conversation(conversation_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    history = store.get_messages(conversation_id)
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
        store.get_coach_state(conversation_id),
        delta_text,
    )
    store.save_coach_state(conversation_id, updated_coach_state)

    memory_text = build_assistant_memory(
        latest_session_report=store.get_latest_session_report(conversation_id),
        coach_state_text=state_to_text(updated_coach_state),
    )

    reply = generate_assistant_reply(history, memory_text=memory_text)
    created_reply = store.add_message(
        conversation_id=conversation_id, role="assistant", content=reply
    )
    report = extractor.generate_session_report(
        [
            {
                "role": message.role,
                "content": message.content,
            }
            for message in store.get_messages(conversation_id)
        ],
        session_label=conversation_id,
    )
    store.add_session_report(conversation_id, report)
    return created_reply


app.include_router(router)
