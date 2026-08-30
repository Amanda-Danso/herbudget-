"""
Declarative base shared by all SQLAlchemy models.
Import this in every model file so Alembic can discover them.
"""
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
