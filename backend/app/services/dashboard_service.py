"""
Dashboard calculations. The backend is the single source of truth for all
financial totals — the frontend must never compute these itself.
"""
from decimal import Decimal

from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.transaction import Transaction

MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]

TWO_PLACES = Decimal("0.01")


def _money(value) -> Decimal:
    """Always return a Decimal quantized to 2 decimal places for currency."""
    return Decimal(str(value if value is not None else 0)).quantize(TWO_PLACES)


def _sum_by_type(db: Session, user_id: str, type_: str) -> Decimal:
    total = (
        db.query(func.coalesce(func.sum(Transaction.amount), 0))
        .filter(Transaction.user_id == user_id, Transaction.type == type_)
        .scalar()
    )
    return _money(total)


def get_summary(db: Session, user_id: str) -> dict:
    total_income = _sum_by_type(db, user_id, "income")
    total_expenses = _sum_by_type(db, user_id, "expense")
    return {
        "total_income": total_income,
        "total_expenses": total_expenses,
        "balance": total_income - total_expenses,
    }


def get_recent_transactions(db: Session, user_id: str, limit: int = 5):
    return (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
        .limit(limit)
        .all()
    )


def get_expenses_by_category(db: Session, user_id: str) -> list[dict]:
    rows = (
        db.query(Category.name, func.coalesce(func.sum(Transaction.amount), 0))
        .join(Transaction, Transaction.category_id == Category.id)
        .filter(Transaction.user_id == user_id, Transaction.type == "expense")
        .group_by(Category.name)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )
    return [{"category": name, "amount": _money(amount)} for name, amount in rows]


def get_monthly_summary(db: Session, user_id: str) -> list[dict]:
    rows = (
        db.query(
            extract("year", Transaction.transaction_date).label("year"),
            extract("month", Transaction.transaction_date).label("month"),
            Transaction.type,
            func.coalesce(func.sum(Transaction.amount), 0),
        )
        .filter(Transaction.user_id == user_id)
        .group_by("year", "month", Transaction.type)
        .order_by("year", "month")
        .all()
    )

    buckets: dict[tuple, dict] = {}
    for year, month, type_, amount in rows:
        key = (int(year), int(month))
        if key not in buckets:
            buckets[key] = {"income": _money(0), "expenses": _money(0)}
        if type_ == "income":
            buckets[key]["income"] = _money(amount)
        else:
            buckets[key]["expenses"] = _money(amount)

    result = []
    for (year, month) in sorted(buckets.keys()):
        result.append(
            {
                "month": f"{MONTH_NAMES[month - 1]} {year}",
                "income": buckets[(year, month)]["income"],
                "expenses": buckets[(year, month)]["expenses"],
            }
        )
    return result
