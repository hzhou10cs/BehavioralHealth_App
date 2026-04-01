from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_name: str


class LessonActivityField(BaseModel):
    id: str
    label: str
    kind: str
    placeholder: str | None = None


class LessonActivity(BaseModel):
    type: str
    title: str
    prompt: str
    fields: list[LessonActivityField] = Field(default_factory=list)


class LessonSection(BaseModel):
    type: str
    title: str
    content: str | None = None
    items: list[str] = Field(default_factory=list)


class LessonSummary(BaseModel):
    id: str
    week: int
    slug: str
    title: str
    phase: str
    summary: str
    status: str


class LessonDetail(LessonSummary):
    objectives: list[str] = Field(default_factory=list)
    sections: list[LessonSection] = Field(default_factory=list)
    activity: LessonActivity | None = None


class ConversationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)


class Conversation(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime


class MessageCreate(BaseModel):
    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=2000)


class Message(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    created_at: datetime


class CoachStateResponse(BaseModel):
    conversation_id: str
    coach_state: dict


class SessionReportsResponse(BaseModel):
    conversation_id: str
    session_reports: list[str]
