from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    user_name: str = Field(min_length=2, max_length=80)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    user_name: str


class UserProfile(BaseModel):
    id: int
    email: EmailStr
    user_name: str
    bio: str = ""
    goals: dict = Field(default_factory=dict)
    created_at: datetime


class UserProfileUpdate(BaseModel):
    user_name: str = Field(min_length=2, max_length=80)
    bio: str = Field(default="", max_length=500)
    goals: dict = Field(default_factory=dict)


class ConversationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)


class Conversation(BaseModel):
    id: int
    title: str
    created_at: datetime
    updated_at: datetime


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class Message(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    created_at: datetime
