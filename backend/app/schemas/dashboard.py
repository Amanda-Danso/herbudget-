from decimal import Decimal
from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_income: Decimal
    total_expenses: Decimal
    balance: Decimal


class CategoryBreakdown(BaseModel):
    category: str
    amount: Decimal


class MonthlySummary(BaseModel):
    month: str
    income: Decimal
    expenses: Decimal
