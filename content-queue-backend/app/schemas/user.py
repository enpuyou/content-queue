from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import datetime
from uuid import UUID


class UserCreate(BaseModel):
    """Data needed to register a new user"""

    email: EmailStr  # Must be valid email format
    password: str
    full_name: str | None = None  # Optional


class UserLogin(BaseModel):
    """Data needed to log in"""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """What we return to the client (no password!)"""

    id: UUID
    email: str
    full_name: str | None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """JWT token response"""

    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Data stored inside the JWT token"""

    email: str | None = None
