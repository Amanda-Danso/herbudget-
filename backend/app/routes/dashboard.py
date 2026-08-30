from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.user import User
from app.schemas.dashboard import CategoryBreakdown, DashboardSummary, MonthlySummary
from app.schemas.transaction import TransactionOut
from app.services.dashboard_service import (
    get_expenses_by_category,
    get_monthly_summary,
    get_recent_transactions,
    get_summary,
)
from app.services.transaction_service import category_name_map

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary, summary="Total income, expenses, and balance")
def summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_summary(db, current_user.id)


@router.get(
    "/recent-transactions",
    response_model=list[TransactionOut],
    summary="Most recent transactions",
)
def recent_transactions(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    transactions = get_recent_transactions(db, current_user.id)
    categories = category_name_map(db, current_user.id)
    result = []
    for t in transactions:
        result.append(
            TransactionOut(
                id=t.id,
                type=t.type,
                amount=t.amount,
                category_id=t.category_id,
                category=categories.get(t.category_id),
                description=t.description,
                transaction_date=t.transaction_date,
                created_at=t.created_at,
                updated_at=t.updated_at,
            )
        )
    return result


@router.get(
    "/expenses-by-category",
    response_model=list[CategoryBreakdown],
    summary="Total expenses grouped by category",
)
def expenses_by_category(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    return get_expenses_by_category(db, current_user.id)


@router.get(
    "/monthly-summary",
    response_model=list[MonthlySummary],
    summary="Income and expenses grouped by month",
)
def monthly_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_monthly_summary(db, current_user.id)
