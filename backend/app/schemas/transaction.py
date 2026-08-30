from datetime import date, datetime
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, Field


class TransactionCreate(BaseModel):
    type: Literal["income", "expense"]
    amount: Decimal = Field(..., gt=0)
    category_id: str
    description: str | None = Field(None, max_length=500)
    transaction_date: date


class TransactionUpdate(BaseModel):
    type: Literal["income", "expense"] | None = None
    amount: Decimal | None = Field(None, gt=0)
    category_id: str | None = None
    description: str | None = Field(None, max_length=500)
    transaction_date: date | None = None


class TransactionOut(BaseModel):
    id: str
    type: str
    amount: Decimal
    category_id: str
    category: str | None = None
    description: str | None = None
    transaction_date: date
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaginatedTransactions(BaseModel):
    items: list[TransactionOut]
    page: int
    limit: int
    total: int
    total_pages: int
