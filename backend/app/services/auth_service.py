"""
Business logic for registration, login, and default category creation.
"""
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.category import Category
from app.models.user import User

DEFAULT_EXPENSE_CATEGORIES = [
    "Food", "Transportation", "Rent", "Bills", "Shopping",
    "Entertainment", "Health", "Education", "Other",
]

DEFAULT_INCOME_CATEGORIES = [
    "Salary", "Freelance", "Business", "Gift", "Investment", "Other",
]


def create_default_categories(db: Session, user_id: str) -> None:
    categories = [
        Category(user_id=user_id, name=name, type="expense")
        for name in DEFAULT_EXPENSE_CATEGORIES
    ] + [
        Category(user_id=user_id, name=name, type="income")
        for name in DEFAULT_INCOME_CATEGORIES
    ]
    db.add_all(categories)
    db.commit()


def register_user(db: Session, name: str, email: str, password: str) -> User:
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise ValueError("A user with this email already exists")

    user = User(name=name, email=email, password_hash=hash_password(password))
    db.add(user)
    db.commit()
    db.refresh(user)

    create_default_categories(db, user.id)
    return user


def authenticate_user(db: Session, email: str, password: str) -> User | None:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        return None
    return user
