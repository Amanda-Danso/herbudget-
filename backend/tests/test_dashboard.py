def test_summary_with_no_transactions(client, auth_headers):
    response = client.get("/api/dashboard/summary", headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == {
        "total_income": "0.00",
        "total_expenses": "0.00",
        "balance": "0.00",
    }


def test_summary_calculates_totals_and_balance(client, auth_headers, category_ids):
    client.post(
        "/api/transactions", headers=auth_headers,
        json={"type": "income", "amount": 5000, "category_id": category_ids["salary"], "transaction_date": "2026-08-01"},
    )
    client.post(
        "/api/transactions", headers=auth_headers,
        json={"type": "expense", "amount": 3200, "category_id": category_ids["food"], "transaction_date": "2026-08-15"},
    )
    response = client.get("/api/dashboard/summary", headers=auth_headers)
    data = response.json()
    assert data["total_income"] == "5000.00"
    assert data["total_expenses"] == "3200.00"
    assert data["balance"] == "1800.00"


def test_expenses_by_category(client, auth_headers, category_ids):
    client.post(
        "/api/transactions", headers=auth_headers,
        json={"type": "expense", "amount": 500, "category_id": category_ids["food"], "transaction_date": "2026-08-01"},
    )
    client.post(
        "/api/transactions", headers=auth_headers,
        json={"type": "expense", "amount": 200, "category_id": category_ids["food"], "transaction_date": "2026-08-02"},
    )
    response = client.get("/api/dashboard/expenses-by-category", headers=auth_headers)
    data = response.json()
    assert data == [{"category": "Food", "amount": "700.00"}]


def test_recent_transactions(client, auth_headers, category_ids):
    client.post(
        "/api/transactions", headers=auth_headers,
        json={"type": "expense", "amount": 10, "category_id": category_ids["food"], "transaction_date": "2026-08-01"},
    )
    response = client.get("/api/dashboard/recent-transactions", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) == 1


def test_monthly_summary(client, auth_headers, category_ids):
    client.post(
        "/api/transactions", headers=auth_headers,
        json={"type": "income", "amount": 4000, "category_id": category_ids["salary"], "transaction_date": "2026-01-15"},
    )
    client.post(
        "/api/transactions", headers=auth_headers,
        json={"type": "expense", "amount": 2500, "category_id": category_ids["food"], "transaction_date": "2026-01-20"},
    )
    response = client.get("/api/dashboard/monthly-summary", headers=auth_headers)
    data = response.json()
    assert data == [{"month": "January 2026", "income": "4000.00", "expenses": "2500.00"}]


def test_dashboard_requires_authentication(client):
    response = client.get("/api/dashboard/summary")
    assert response.status_code == 401


def test_dashboard_isolated_per_user(client, auth_headers, category_ids):
    client.post(
        "/api/transactions", headers=auth_headers,
        json={"type": "income", "amount": 1000, "category_id": category_ids["salary"], "transaction_date": "2026-08-01"},
    )
    client.post(
        "/api/auth/register",
        json={"name": "Bea", "email": "bea@example.com", "password": "password123"},
    )
    login = client.post(
        "/api/auth/login", json={"email": "bea@example.com", "password": "password123"}
    )
    bea_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    response = client.get("/api/dashboard/summary", headers=bea_headers)
    assert response.json()["total_income"] == "0.00"
