def test_create_transaction(client, auth_headers, category_ids):
    response = client.post(
        "/api/transactions",
        headers=auth_headers,
        json={
            "type": "expense",
            "amount": 150.00,
            "category_id": category_ids["food"],
            "description": "Groceries",
            "transaction_date": "2026-08-29",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["amount"] == "150.00"
    assert data["category"] == "Food"


def test_create_transaction_negative_amount_rejected(client, auth_headers, category_ids):
    response = client.post(
        "/api/transactions",
        headers=auth_headers,
        json={
            "type": "expense",
            "amount": -50,
            "category_id": category_ids["food"],
            "transaction_date": "2026-08-29",
        },
    )
    assert response.status_code == 422


def test_create_transaction_missing_fields_rejected(client, auth_headers):
    response = client.post("/api/transactions", headers=auth_headers, json={"type": "expense"})
    assert response.status_code == 422


def test_create_transaction_invalid_category_rejected(client, auth_headers):
    response = client.post(
        "/api/transactions",
        headers=auth_headers,
        json={
            "type": "expense",
            "amount": 10,
            "category_id": "not-a-real-category",
            "transaction_date": "2026-08-29",
        },
    )
    assert response.status_code == 400


def test_get_transactions_list(client, auth_headers, category_ids):
    client.post(
        "/api/transactions",
        headers=auth_headers,
        json={
            "type": "expense", "amount": 50, "category_id": category_ids["food"],
            "transaction_date": "2026-08-29",
        },
    )
    response = client.get("/api/transactions", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1


def test_get_transaction_by_id(client, auth_headers, category_ids):
    created = client.post(
        "/api/transactions",
        headers=auth_headers,
        json={
            "type": "expense", "amount": 50, "category_id": category_ids["food"],
            "transaction_date": "2026-08-29",
        },
    ).json()
    response = client.get(f"/api/transactions/{created['id']}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_get_transaction_not_found(client, auth_headers):
    response = client.get("/api/transactions/does-not-exist", headers=auth_headers)
    assert response.status_code == 404


def test_update_transaction(client, auth_headers, category_ids):
    created = client.post(
        "/api/transactions",
        headers=auth_headers,
        json={
            "type": "expense", "amount": 50, "category_id": category_ids["food"],
            "transaction_date": "2026-08-29",
        },
    ).json()
    response = client.put(
        f"/api/transactions/{created['id']}",
        headers=auth_headers,
        json={"amount": 75.50, "description": "Updated"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["amount"] == "75.50"
    assert data["description"] == "Updated"


def test_delete_transaction(client, auth_headers, category_ids):
    created = client.post(
        "/api/transactions",
        headers=auth_headers,
        json={
            "type": "expense", "amount": 50, "category_id": category_ids["food"],
            "transaction_date": "2026-08-29",
        },
    ).json()
    response = client.delete(f"/api/transactions/{created['id']}", headers=auth_headers)
    assert response.status_code == 204

    response = client.get(f"/api/transactions/{created['id']}", headers=auth_headers)
    assert response.status_code == 404


def test_transactions_require_authentication(client):
    response = client.get("/api/transactions")
    assert response.status_code == 401


def test_user_cannot_access_another_users_transaction(client, auth_headers, category_ids):
    created = client.post(
        "/api/transactions",
        headers=auth_headers,
        json={
            "type": "expense", "amount": 50, "category_id": category_ids["food"],
            "transaction_date": "2026-08-29",
        },
    ).json()

    client.post(
        "/api/auth/register",
        json={"name": "Bea", "email": "bea@example.com", "password": "password123"},
    )
    login = client.post(
        "/api/auth/login", json={"email": "bea@example.com", "password": "password123"}
    )
    other_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

    assert client.get(f"/api/transactions/{created['id']}", headers=other_headers).status_code == 404
    assert client.put(f"/api/transactions/{created['id']}", headers=other_headers, json={"amount": 1}).status_code == 404
    assert client.delete(f"/api/transactions/{created['id']}", headers=other_headers).status_code == 404


def test_filter_transactions_by_type(client, auth_headers, category_ids):
    client.post(
        "/api/transactions", headers=auth_headers,
        json={"type": "expense", "amount": 50, "category_id": category_ids["food"], "transaction_date": "2026-08-29"},
    )
    client.post(
        "/api/transactions", headers=auth_headers,
        json={"type": "income", "amount": 4000, "category_id": category_ids["salary"], "transaction_date": "2026-08-28"},
    )
    response = client.get("/api/transactions?type=income", headers=auth_headers)
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["type"] == "income"
