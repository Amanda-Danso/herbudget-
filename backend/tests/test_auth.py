def test_register_user_success(client):
    response = client.post(
        "/api/auth/register",
        json={"name": "Amanda", "email": "amanda@example.com", "password": "password123"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Amanda"
    assert data["email"] == "amanda@example.com"
    assert "password" not in data
    assert "password_hash" not in data


def test_register_duplicate_email_rejected(client):
    payload = {"name": "Amanda", "email": "amanda@example.com", "password": "password123"}
    client.post("/api/auth/register", json=payload)
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == 409


def test_register_creates_default_categories(client):
    client.post(
        "/api/auth/register",
        json={"name": "Amanda", "email": "amanda@example.com", "password": "password123"},
    )
    login = client.post(
        "/api/auth/login", json={"email": "amanda@example.com", "password": "password123"}
    )
    headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    response = client.get("/api/categories", headers=headers)
    categories = response.json()
    assert len(categories) == 15
    names = {c["name"] for c in categories}
    assert "Food" in names
    assert "Salary" in names


def test_login_success(client):
    client.post(
        "/api/auth/register",
        json={"name": "Amanda", "email": "amanda@example.com", "password": "password123"},
    )
    response = client.post(
        "/api/auth/login", json={"email": "amanda@example.com", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_invalid_password(client):
    client.post(
        "/api/auth/register",
        json={"name": "Amanda", "email": "amanda@example.com", "password": "password123"},
    )
    response = client.post(
        "/api/auth/login", json={"email": "amanda@example.com", "password": "wrongpassword"}
    )
    assert response.status_code == 401


def test_login_nonexistent_user(client):
    response = client.post(
        "/api/auth/login", json={"email": "nobody@example.com", "password": "password123"}
    )
    assert response.status_code == 401


def test_get_current_user(client, auth_headers):
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["email"] == "amanda@example.com"


def test_get_current_user_requires_auth(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401


def test_get_current_user_rejects_invalid_token(client):
    response = client.get(
        "/api/auth/me", headers={"Authorization": "Bearer not-a-real-token"}
    )
    assert response.status_code == 401
