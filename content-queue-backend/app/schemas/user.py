from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from uuid import UUID


class UserCreate(BaseModel):
    """Data needed to register a new user"""

    email: EmailStr  # Must be valid email format
    password: str
    username: str
    full_name: str | None = None  # Optional


class UserLogin(BaseModel):
    """Data needed to log in"""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """What we return to the client (no password!)"""

    id: UUID
    email: str
    username: str | None
    full_name: str | None
    is_active: bool
    is_public: bool
    is_queue_public: bool
    is_crates_public: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """JWT token response"""

    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Data stored inside the JWT token"""

    email: str | None = None


class UserUpdate(BaseModel):
    """Fields that can be updated on a user profile"""

    full_name: str | None = None
    username: str | None = None
    is_public: bool | None = None
    is_queue_public: bool | None = None
    is_crates_public: bool | None = None
