"""
Business logic for transactions: creation, filtering, pagination, and
ownership enforcement. All financial arithmetic happens here on the backend.
"""
from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.category import Category
from app.models.transaction import Transaction


def get_transaction_or_none(db: Session, user_id: str, transaction_id: str) -> Transaction | None:
    return (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.user_id == user_id)
        .first()
    )


def list_transactions(
    db: Session,
    user_id: str,
    type_: str | None = None,
    category_id: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
    page: int = 1,
    limit: int = 20,
):
    query = db.query(Transaction).filter(Transaction.user_id == user_id)

    if type_:
        query = query.filter(Transaction.type == type_)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)
    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)
    if search:
        query = query.filter(Transaction.description.ilike(f"%{search}%"))

    total = query.count()
    query = query.order_by(Transaction.transaction_date.desc(), Transaction.created_at.desc())
    items = query.offset((page - 1) * limit).limit(limit).all()

    total_pages = (total + limit - 1) // limit if total else 0
    return items, total, total_pages


def category_name_map(db: Session, user_id: str) -> dict:
    rows = db.query(Category.id, Category.name).filter(Category.user_id == user_id).all()
    return {row.id: row.name for row in rows}
