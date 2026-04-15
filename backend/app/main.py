import json
import sqlite3
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.assistant_agent import (
    build_assistant_memory,
    build_extractor_agent,
    build_generator_agent,
    generate_assistant_reply,
)
from app.auth import create_access_token, hash_password, verify_access_token, verify_password
from app.config import Settings, get_settings
from app.schemas import (
    CoachStateResponse,
    CompletedConversation,
    Conversation,
    ConversationCreate,
    HealthProfile,
    HealthProfileResponse,
    LessonDetail,
    LessonSummary,
    LoginRequest,
    LoginResponse,
    Message,
    MessageCreate,
    RegisterRequest,
    SessionSummaryResponse,
    SessionReportsResponse,
    TutorialStatusResponse,
)
from app.services.chatbox.chat_prompts import COACH_SYSTEM_PROMPT_1ST_SESSION
from app.services.chatbox.state_tracker import (
    apply_delta_text,
    build_initial_cst,
    state_to_text,
)
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


def _api_debug(event: str, **payload: object) -> None:
    if not settings.assistant_debug_logging:
        return
    print(
        f"[API DEBUG] {event} | {json.dumps(payload, ensure_ascii=False, default=str)}",
        flush=True,
    )


def _auth_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _from_isoformat(value: str) -> datetime:
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return datetime.fromtimestamp(0, tz=timezone.utc)


def _is_account_locked(locked_until: str | None) -> bool:
    if not locked_until:
        return False
    expiry = _from_isoformat(locked_until)
    return expiry > datetime.now(timezone.utc)


def _locked_seconds_remaining(locked_until: str | None) -> int:
    if not locked_until:
        return 0
    expiry = _from_isoformat(locked_until)
    remaining = (expiry - datetime.now(timezone.utc)).total_seconds()
    return int(remaining) if remaining > 0 else 0


def _auth_locked_error(remaining_seconds: int | None = None) -> HTTPException:
    if remaining_seconds is None or remaining_seconds <= 0:
        detail = "Too many failed login attempts. Try again after 5 minutes."
    else:
        minutes = remaining_seconds // 60
        seconds = remaining_seconds % 60
        if minutes >= 1:
            detail = f"Too many failed login attempts. Try again in {minutes} minute(s)."
        else:
            detail = f"Too many failed login attempts. Try again in {seconds} second(s)."

    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=detail,
    )


def _current_lesson_number(user_id: int) -> int:
    lessons = store.list_lessons(user_id=user_id)
    in_progress = next((lesson for lesson in lessons if lesson.status == "in_progress"), None)
    if in_progress is not None:
        return int(in_progress.week)
    completed_weeks = [int(lesson.week) for lesson in lessons if lesson.status == "completed"]
    return max(completed_weeks) if completed_weeks else 1


def _conversation_order_key(
    conversation: Conversation | CompletedConversation,
) -> tuple[datetime, int]:
    _, _, raw_id = conversation.id.partition("-")
    try:
        internal_id = int(raw_id)
    except ValueError:
        internal_id = 0
    return (conversation.created_at, internal_id)


def _list_user_conversations_ordered(
    user_id: int,
) -> list[Conversation | CompletedConversation]:
    all_conversations: list[Conversation | CompletedConversation] = [
        *store.list_conversations(user_id=user_id),
        *store.list_completed_conversations(user_id=user_id),
    ]
    return sorted(all_conversations, key=_conversation_order_key)


def _session_index_for_conversation(conversation_id: str, user_id: int) -> int:
    ordered_conversations = _list_user_conversations_ordered(user_id)
    for index, conversation in enumerate(ordered_conversations, start=1):
        if conversation.id == conversation_id:
            return index
    return max(1, len(ordered_conversations))


def _is_first_turn_of_session(history: list[Message]) -> bool:
    user_turn_count = sum(1 for message in history if message.role == "user")
    assistant_turn_count = sum(1 for message in history if message.role == "assistant")
    return user_turn_count == 1 and assistant_turn_count == 0


def _is_first_turn_first_session(
    *,
    conversation_id: str,
    history: list[Message],
    user_id: int,
) -> bool:
    if not _is_first_turn_of_session(history):
        return False

    ordered_conversations = _list_user_conversations_ordered(user_id)
    if not ordered_conversations:
        return False

    first_conversation = ordered_conversations[0]
    return first_conversation.id == conversation_id


def _build_previous_session_reports_text(user_id: int, conversation_id: str) -> str:
    current_session_index = _session_index_for_conversation(conversation_id, user_id)
    ordered_conversations = _list_user_conversations_ordered(user_id)
    session_reports: list[str] = []

    for session_index, conversation in enumerate(ordered_conversations, start=1):
        if session_index >= current_session_index:
            break
        report_text = store.get_latest_session_report(
            conversation.id, user_id=user_id
        ).strip()
        if not report_text:
            continue
        session_reports.append(
            f"Summarized report for session {session_index}:\n{report_text}"
        )

    return "\n\n".join(session_reports)


def _format_history_text(conversation_messages: list[Message]) -> str:
    lines: list[str] = []
    for message in conversation_messages:
        if message.role == "user":
            lines.append(f"User: {message.content.strip()}")
        elif message.role == "assistant":
            lines.append(f"Assistant: {message.content.strip()}")
    return "\n".join(lines).strip()


def _build_generator_meta_text(current_account: dict, session_index: int) -> str:
    user_name = str(current_account.get("name") or current_account.get("email") or "")
    health_profile = store.get_health_profile_for_auth_user(int(current_account["id"]))
    profile_text = json.dumps(health_profile, ensure_ascii=False, indent=2)
    return (
        f"User name: {user_name}\n"
        f"Current session: session_{session_index}\n"
        f"User health profile (JSON):\n{profile_text}"
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
    if account is not None and _is_account_locked(account.get("locked_until")):
        remaining_seconds = _locked_seconds_remaining(account.get("locked_until"))
        raise _auth_locked_error(remaining_seconds)

    dummy_salt, dummy_hash = hash_password("invalid-password")
    password_ok = False
    if account is not None:
        password_ok = verify_password(
            payload.password,
            account["password_salt"],
            account["password_hash"],
        )
    else:
        verify_password(payload.password, dummy_salt, dummy_hash)

    if account is None or not password_ok:
        if account is not None:
            current_attempts = int(account.get("failed_login_attempts", 0)) + 1
            lockout_until = None
            if current_attempts >= settings.auth_max_failed_login_attempts:
                lockout_until = (
                    datetime.now(timezone.utc)
                    + timedelta(seconds=settings.auth_lockout_duration_seconds)
                ).isoformat()
            store.increment_failed_login_attempts(
                int(account["id"]), lockout_until=lockout_until
            )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wrong password or email",
        )

    store.reset_failed_login_attempts(int(account["id"]))
    return LoginResponse(
        access_token=create_access_token(
            auth_user_id=int(account["id"]),
            user_id=int(account["user_id"]),
            email=email,
            secret_key=settings.auth_secret_key,
            expires_in=settings.auth_token_expiration_seconds,
        ),
        user_name=str(account["name"]),
        tutorial_required=not bool(account.get("tutorial_completed")),
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
    profile_payload = payload.health_profile.model_dump() if payload.health_profile else {}
    if not profile_payload.get("register_date"):
        profile_payload["register_date"] = date.today().isoformat()
    if not profile_payload.get("email"):
        profile_payload["email"] = email

    try:
        auth_user_id = store.create_auth_user(
            email=email,
            name=payload.name,
            password_salt=salt,
            password_hash=password_hash,
            health_profile_json=json.dumps(profile_payload),
        )
    except sqlite3.IntegrityError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered",
        ) from exc

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
        user_name=str(account["name"]),
        tutorial_required=not bool(account.get("tutorial_completed")),
    )



@router.post("/auth/tutorial/complete", response_model=TutorialStatusResponse)
def complete_tutorial(
    current_account: dict = Depends(get_current_account),
) -> TutorialStatusResponse:
    store.mark_tutorial_completed_for_auth_user(int(current_account["id"]))
    return TutorialStatusResponse(tutorial_required=False)


@router.get("/auth/profile", response_model=HealthProfileResponse)
def get_health_profile(current_account: dict = Depends(get_current_account)) -> HealthProfileResponse:
    profile_payload = store.get_health_profile_for_auth_user(int(current_account["id"]))
    profile = HealthProfile(**profile_payload)
    if not profile.email:
        profile.email = str(current_account["email"])
    if not profile.register_date:
        profile.register_date = date.today().isoformat()
    return HealthProfileResponse(profile=profile)


@router.put("/auth/profile", response_model=HealthProfileResponse)
def update_health_profile(
    payload: HealthProfile,
    current_account: dict = Depends(get_current_account),
) -> HealthProfileResponse:
    profile_payload = payload.model_dump()
    if not profile_payload.get("email"):
        profile_payload["email"] = str(current_account["email"])
    if not profile_payload.get("register_date"):
        profile_payload["register_date"] = date.today().isoformat()
    store.update_health_profile_for_auth_user(int(current_account["id"]), profile_payload)
    return HealthProfileResponse(profile=HealthProfile(**profile_payload))
@router.get("/lessons", response_model=list[LessonSummary])
def list_lessons(
    current_account: dict = Depends(get_current_account),
) -> list[LessonSummary]:
    return store.list_lessons(user_id=int(current_account["user_id"]))


@router.get("/lessons/{lesson_id}", response_model=LessonDetail)
def get_lesson(
    lesson_id: str, current_account: dict = Depends(get_current_account)
) -> LessonDetail:
    lesson = store.get_lesson(lesson_id, user_id=int(current_account["user_id"]))
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if lesson.status == "locked":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Finish the previous lesson first",
        )
    return lesson


@router.post("/lessons/{lesson_id}/complete", response_model=LessonDetail)
def complete_lesson(
    lesson_id: str, current_account: dict = Depends(get_current_account)
) -> LessonDetail:
    lesson = store.get_lesson(lesson_id, user_id=int(current_account["user_id"]))
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if lesson.status == "locked":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Finish the previous lesson first",
        )
    completed = store.complete_lesson(lesson_id, user_id=int(current_account["user_id"]))
    if completed is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return completed


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


@router.get("/conversations/completed", response_model=list[CompletedConversation])
def list_completed_conversations(
    current_account: dict = Depends(get_current_account),
) -> list[CompletedConversation]:
    return store.list_completed_conversations(user_id=int(current_account["user_id"]))


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
    if store.is_conversation_ended(conversation_id, user_id=user_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session already ended. Start a new conversation.",
        )
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


@router.get(
    "/conversations/{conversation_id}/session-summary",
    response_model=SessionSummaryResponse,
)
def get_session_summary(
    conversation_id: str, current_account: dict = Depends(get_current_account)
) -> SessionSummaryResponse:
    user_id = int(current_account["user_id"])
    if not store.has_conversation(conversation_id, user_id=user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    report = store.get_latest_session_report(conversation_id, user_id=user_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session summary is not available yet.",
        )
    return SessionSummaryResponse(conversation_id=conversation_id, report=report)


@router.post(
    "/conversations/{conversation_id}/end-session",
    response_model=SessionSummaryResponse,
)
def end_session(
    conversation_id: str, current_account: dict = Depends(get_current_account)
) -> SessionSummaryResponse:
    user_id = int(current_account["user_id"])
    _api_debug(
        "end_session.start",
        user_id=user_id,
        conversation_id=conversation_id,
    )
    if not store.has_conversation(conversation_id, user_id=user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    existing_report = store.get_latest_session_report(conversation_id, user_id=user_id)
    if existing_report:
        _api_debug(
            "end_session.reuse_existing_report",
            user_id=user_id,
            conversation_id=conversation_id,
        )
        return SessionSummaryResponse(
            conversation_id=conversation_id,
            report=existing_report,
        )

    extractor = build_extractor_agent()
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
    store.add_session_report(
        conversation_id,
        report,
        user_id=user_id,
        lesson_number=_current_lesson_number(user_id),
    )
    _api_debug(
        "end_session.generated_report",
        user_id=user_id,
        conversation_id=conversation_id,
        report=report,
    )
    return SessionSummaryResponse(conversation_id=conversation_id, report=report)


@router.post(
    "/conversations/{conversation_id}/assistant-reply",
    response_model=Message,
    status_code=status.HTTP_201_CREATED,
)
def create_assistant_reply(
    conversation_id: str, current_account: dict = Depends(get_current_account)
) -> Message:
    user_id = int(current_account["user_id"])
    _api_debug(
        "assistant_reply.start",
        user_id=user_id,
        conversation_id=conversation_id,
    )
    if not store.has_conversation(conversation_id, user_id=user_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if store.is_conversation_ended(conversation_id, user_id=user_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Session already ended. Start a new conversation.",
        )

    history = store.get_messages(conversation_id, user_id=user_id)
    session_index = _session_index_for_conversation(conversation_id, user_id)
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
    _api_debug(
        "assistant_reply.extractor_done",
        conversation_id=conversation_id,
        session_index=session_index,
        latest_user_message=(latest_user_message.content if latest_user_message else ""),
        previous_assistant_message=(
            previous_assistant_message.content if previous_assistant_message else ""
        ),
        delta_text=delta_text,
    )

    session_timestamp = f"{date.today().isoformat()}_session{session_index}"
    current_coach_state = store.get_coach_state(conversation_id, user_id=user_id)
    if current_coach_state:
        current_coach_state.setdefault("session", {})
        current_coach_state["session"]["session_timestamp"] = session_timestamp
    else:
        current_coach_state = build_initial_cst(
            session_timestamp, session_num=session_index
        )

    updated_coach_state = apply_delta_text(
        current_coach_state,
        delta_text,
        session_num=session_index,
    )
    updated_coach_state["session"]["session_timestamp"] = session_timestamp
    store.save_coach_state(conversation_id, updated_coach_state, user_id=user_id)
    _api_debug(
        "assistant_reply.cst_saved",
        conversation_id=conversation_id,
        session_index=session_index,
        cst=updated_coach_state,
    )

    memory_text = build_assistant_memory(
        previous_session_reports_text=_build_previous_session_reports_text(
            user_id, conversation_id
        ),
        coach_state_text=state_to_text(updated_coach_state),
    )
    _api_debug(
        "assistant_reply.memory_built",
        conversation_id=conversation_id,
        session_index=session_index,
        memory_text=memory_text,
    )

    prompt_patch: str | None = None
    if not _is_first_turn_of_session(history):
        generator = build_generator_agent()
        prompt_patch = generator.generate_prompt_patch(
            updated_coach_state,
            chat_history_text=_format_history_text(history),
            meta_text=_build_generator_meta_text(current_account, session_index),
        )
    _api_debug(
        "assistant_reply.patch_decision",
        conversation_id=conversation_id,
        session_index=session_index,
        is_first_turn_of_session=_is_first_turn_of_session(history),
        prompt_patch=prompt_patch,
    )

    if _is_first_turn_first_session(
        conversation_id=conversation_id,
        history=history,
        user_id=user_id,
    ):
        reply = generate_assistant_reply(
            history,
            memory_text=memory_text,
            base_prompt=COACH_SYSTEM_PROMPT_1ST_SESSION,
            include_fewshot=False,
        )
        _api_debug(
            "assistant_reply.first_session_first_turn_prompt",
            conversation_id=conversation_id,
            session_index=session_index,
            base_prompt="COACH_SYSTEM_PROMPT_1ST_SESSION",
        )
    else:
        reply = generate_assistant_reply(
            history,
            memory_text=memory_text,
            prompt_patch=prompt_patch,
        )
        _api_debug(
            "assistant_reply.default_prompt_path",
            conversation_id=conversation_id,
            session_index=session_index,
            prompt_patch=prompt_patch,
        )
    created_reply = store.add_message(
        conversation_id=conversation_id,
        role="assistant",
        content=reply,
        user_id=user_id,
    )
    _api_debug(
        "assistant_reply.completed",
        conversation_id=conversation_id,
        session_index=session_index,
        reply=reply,
    )
    return created_reply


app.include_router(router)


