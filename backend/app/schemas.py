from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_name: str


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
