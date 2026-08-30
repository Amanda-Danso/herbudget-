from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import (
    PaginatedTransactions,
    TransactionCreate,
    TransactionOut,
    TransactionUpdate,
)
from app.services.transaction_service import (
    category_name_map,
    get_transaction_or_none,
    list_transactions,
)

router = APIRouter(prefix="/api/transactions", tags=["Transactions"])


def _to_out(transaction: Transaction, categories: dict) -> TransactionOut:
    return TransactionOut(
        id=transaction.id,
        type=transaction.type,
        amount=transaction.amount,
        category_id=transaction.category_id,
        category=categories.get(transaction.category_id),
        description=transaction.description,
        transaction_date=transaction.transaction_date,
        created_at=transaction.created_at,
        updated_at=transaction.updated_at,
    )


@router.get("", response_model=PaginatedTransactions, summary="List transactions (filterable, paginated)")
def get_transactions(
    type: str | None = Query(None, pattern="^(income|expense)$"),
    category_id: str | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    search: str | None = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    items, total, total_pages = list_transactions(
        db, current_user.id, type, category_id, start_date, end_date, search, page, limit
    )
    categories = category_name_map(db, current_user.id)
    return PaginatedTransactions(
        items=[_to_out(t, categories) for t in items],
        page=page,
        limit=limit,
        total=total,
        total_pages=total_pages,
    )


@router.get("/{transaction_id}", response_model=TransactionOut, summary="Get a single transaction")
def get_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction = get_transaction_or_none(db, current_user.id, transaction_id)
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")
    categories = category_name_map(db, current_user.id)
    return _to_out(transaction, categories)


@router.post(
    "", response_model=TransactionOut, status_code=status.HTTP_201_CREATED, summary="Create a transaction"
)
def create_transaction(
    payload: TransactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = (
        db.query(Category)
        .filter(Category.id == payload.category_id, Category.user_id == current_user.id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category")

    transaction = Transaction(
        user_id=current_user.id,
        category_id=payload.category_id,
        type=payload.type,
        amount=payload.amount,
        description=payload.description,
        transaction_date=payload.transaction_date,
    )
    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    categories = category_name_map(db, current_user.id)
    return _to_out(transaction, categories)


@router.put("/{transaction_id}", response_model=TransactionOut, summary="Update a transaction")
def update_transaction(
    transaction_id: str,
    payload: TransactionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction = get_transaction_or_none(db, current_user.id, transaction_id)
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    if payload.category_id is not None:
        category = (
            db.query(Category)
            .filter(Category.id == payload.category_id, Category.user_id == current_user.id)
            .first()
        )
        if not category:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category")
        transaction.category_id = payload.category_id

    if payload.type is not None:
        transaction.type = payload.type
    if payload.amount is not None:
        transaction.amount = payload.amount
    if payload.description is not None:
        transaction.description = payload.description
    if payload.transaction_date is not None:
        transaction.transaction_date = payload.transaction_date

    db.commit()
    db.refresh(transaction)

    categories = category_name_map(db, current_user.id)
    return _to_out(transaction, categories)


@router.delete(
    "/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a transaction"
)
def delete_transaction(
    transaction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transaction = get_transaction_or_none(db, current_user.id, transaction_id)
    if not transaction:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    db.delete(transaction)
    db.commit()
    return None
