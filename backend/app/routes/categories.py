from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database.database import get_db
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate

router = APIRouter(prefix="/api/categories", tags=["Categories"])


@router.get("", response_model=list[CategoryOut], summary="List the user's categories")
def list_categories(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    rows = (
        db.query(Category, func.count(Transaction.id).label("transaction_count"))
        .outerjoin(Transaction, Transaction.category_id == Category.id)
        .filter(Category.user_id == current_user.id)
        .group_by(Category.id)
        .order_by(Category.type, Category.name)
        .all()
    )
    result = []
    for category, count in rows:
        out = CategoryOut.model_validate(category)
        out.transaction_count = count
        result.append(out)
    return result


@router.post(
    "", response_model=CategoryOut, status_code=status.HTTP_201_CREATED, summary="Create a category"
)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = Category(user_id=current_user.id, name=payload.name, type=payload.type)
    db.add(category)
    db.commit()
    db.refresh(category)
    out = CategoryOut.model_validate(category)
    out.transaction_count = 0
    return out


@router.put("/{category_id}", response_model=CategoryOut, summary="Update a category")
def update_category(
    category_id: str,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = (
        db.query(Category)
        .filter(Category.id == category_id, Category.user_id == current_user.id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    if payload.name is not None:
        category.name = payload.name
    if payload.type is not None:
        category.type = payload.type

    db.commit()
    db.refresh(category)

    count = (
        db.query(func.count(Transaction.id))
        .filter(Transaction.category_id == category.id)
        .scalar()
    )
    out = CategoryOut.model_validate(category)
    out.transaction_count = count
    return out


@router.delete(
    "/{category_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a category"
)
def delete_category(
    category_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    category = (
        db.query(Category)
        .filter(Category.id == category_id, Category.user_id == current_user.id)
        .first()
    )
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    in_use = (
        db.query(func.count(Transaction.id))
        .filter(Transaction.category_id == category.id)
        .scalar()
    )
    if in_use:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete a category that has transactions. "
                   "Reassign or delete those transactions first.",
        )

    db.delete(category)
    db.commit()
    return None
