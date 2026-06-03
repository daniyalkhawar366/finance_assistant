from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    full_name: str | None = None
    portfolio_tier: str | None = None

class UserLogin(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: str | None = None
    password: str | None = Field(None, min_length=6)

class UserResponse(UserBase):
    id: str
    full_name: str | None = None
    portfolio_tier: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: str | None = None
    user_id: str | None = None

class TransactionBase(BaseModel):
    date: str  # YYYY-MM-DD
    description: str
    amount: float
    category: str
    status: str = "posted"

class TransactionCreate(TransactionBase):
    pass

class TransactionResponse(TransactionBase):
    id: str
    user_id: str
    receipt_image: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True

class BudgetBase(BaseModel):
    category: str
    limit_amount: float
    period: str = "monthly"

class BudgetCreate(BudgetBase):
    pass

class BudgetResponse(BudgetBase):
    id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True

class UserContextBase(BaseModel):
    context_key: str
    context_value: str

class UserContextCreate(UserContextBase):
    pass

class UserContextResponse(UserContextBase):
    id: str
    user_id: str
    updated_at: datetime

    class Config:
        from_attributes = True

class SubscriptionResponse(BaseModel):
    id: str
    user_id: str
    merchant: str
    amount: float
    frequency: str
    last_charged_date: str
    created_at: datetime

    class Config:
        from_attributes = True

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    sql_queries: list[str] = []
