"""
Shared pytest fixtures: an isolated in-memory SQLite database per test run,
and a TestClient wired to use it instead of the real database.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database.base import Base
from app.database.database import get_db
from app.main import app

TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,  # keep a single shared in-memory DB connection for the test run
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def auth_headers(client):
    """Registers and logs in a default test user, returning auth headers."""
    client.post(
        "/api/auth/register",
        json={"name": "Amanda", "email": "amanda@example.com", "password": "password123"},
    )
    response = client.post(
        "/api/auth/login",
        json={"email": "amanda@example.com", "password": "password123"},
    )
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def category_ids(client, auth_headers):
    """Returns the ids of the default 'Food' and 'Salary' categories."""
    response = client.get("/api/categories", headers=auth_headers)
    categories = response.json()
    food_id = next(c["id"] for c in categories if c["name"] == "Food")
    salary_id = next(c["id"] for c in categories if c["name"] == "Salary")
    return {"food": food_id, "salary": salary_id}
