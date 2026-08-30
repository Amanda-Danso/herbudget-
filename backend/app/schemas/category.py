from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    type: Literal["income", "expense"]


class CategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=80)
    type: Literal["income", "expense"] | None = None


class CategoryOut(BaseModel):
    id: str
    name: str
    type: str
    created_at: datetime
    transaction_count: int = 0

    class Config:
        from_attributes = True
