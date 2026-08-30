# HerBudget — Backend

FastAPI REST API for HerBudget. See the root `README.md` for the full
project overview, architecture, and setup walkthrough. This file is a
quick reference for working in `backend/` specifically.

## Quick start

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # then edit .env
alembic upgrade head
uvicorn app.main:app --reload
```

- API: http://127.0.0.1:8000
- Swagger UI: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

## Tests

```bash
pytest -v
```

Tests run against an isolated in-memory SQLite database (see
`tests/conftest.py`) and never touch your real database.

## Alembic cheatsheet

```bash
alembic revision --autogenerate -m "message"   # create a migration after model changes
alembic upgrade head                            # apply all pending migrations
alembic downgrade -1                             # roll back the last migration
```

## Folder guide

| Folder | Purpose |
|---|---|
| `app/core` | Config, JWT/password security, `get_current_user` dependency |
| `app/database` | SQLAlchemy engine/session, declarative base |
| `app/models` | ORM table definitions |
| `app/schemas` | Pydantic request/response models |
| `app/routes` | HTTP endpoints |
| `app/services` | Business logic and financial calculations |
| `tests` | pytest suite |
