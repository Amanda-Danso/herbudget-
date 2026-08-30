# HerBudget

HerBudget is a simple, modern personal finance tracker. It lets a user
register, log in, record income and expense transactions, organize them
into categories, and see an automatically calculated financial dashboard
(balance, income, expenses, spending by category, and monthly trends).

This is a full-stack MVP: a vanilla HTML/CSS/JS frontend talking to a
FastAPI + PostgreSQL (Supabase-compatible) backend over a REST API,
secured with JWT authentication.

---

## Features

- Register / login with JWT authentication and bcrypt password hashing
- Personal dashboard: total balance, income, expenses
- Charts (Chart.js): expenses by category, income vs. expenses, monthly trend
- Full transaction CRUD with filtering (type, category, date range, search) and pagination
- Category management (create/edit/delete, with protection against deleting categories in use)
- Default categories automatically created for every new user
- Profile settings: update name, change password
- Toast notifications, loading states, empty states, responsive design (375px–1440px+)
- Every user can only ever see and modify their own data — enforced on the backend
- All money calculations (totals, balance, category sums) happen on the backend using `Decimal`, never in the browser

---

## Technology Stack

**Frontend:** HTML5, CSS3, vanilla JavaScript, Fetch API, Chart.js (via CDN)

**Backend:** Python 3, FastAPI, Uvicorn, Pydantic, SQLAlchemy, Alembic

**Database:** PostgreSQL (Supabase-compatible); SQLite is used automatically as a local fallback if `DATABASE_URL` isn't set, so you can try the app without provisioning Postgres first.

**Auth:** JWT (python-jose) + bcrypt password hashing (passlib)

**Testing:** pytest + FastAPI `TestClient` (28 tests, all passing)

---

## Architecture

```
HTML / CSS / JS  (frontend/)
      │
      │  HTTP / REST (fetch, JSON, JWT bearer token)
      ▼
FastAPI application (backend/app)
      │
      │  SQLAlchemy ORM
      ▼
PostgreSQL / Supabase (or SQLite for local dev)
```

The backend is organized into layers:

- **routes/** — HTTP endpoints only (parse request, call a service, return a response)
- **services/** — business logic and calculations (the backend is the source of truth for all money math)
- **models/** — SQLAlchemy ORM table definitions
- **schemas/** — Pydantic request/response validation
- **core/** — config, security (JWT/hashing), and the `get_current_user` auth dependency
- **database/** — engine/session setup

---

## Project Structure

```
HerBudget/
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app, CORS, error handlers, router registration
│   │   ├── core/
│   │   │   ├── config.py          # Settings loaded from environment variables
│   │   │   ├── security.py        # Password hashing + JWT create/verify
│   │   │   └── dependencies.py    # get_current_user()
│   │   ├── database/
│   │   │   ├── database.py        # SQLAlchemy engine/session, get_db()
│   │   │   └── base.py            # Declarative Base
│   │   ├── models/                # user.py, category.py, transaction.py
│   │   ├── schemas/                # user.py, category.py, transaction.py, dashboard.py
│   │   ├── routes/                 # auth.py, categories.py, transactions.py, dashboard.py
│   │   └── services/               # auth_service.py, transaction_service.py, dashboard_service.py
│   ├── alembic/                    # Migrations (env.py wired to app settings + models)
│   ├── tests/                      # test_auth.py, test_transactions.py, test_dashboard.py, conftest.py
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
│
├── frontend/
│   ├── index.html          # Landing page
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── transactions.html
│   ├── categories.html
│   ├── settings.html
│   ├── css/
│   │   ├── style.css       # Shared design system (cards, buttons, tables, modal, responsive)
│   │   ├── auth.css        # Landing/login/register-specific styles
│   │   └── dashboard.css   # Dashboard-specific tweaks
│   └── js/
│       ├── api.js          # Centralized fetch wrapper (JWT, error handling, formatCurrency)
│       ├── ui.js            # Toasts, sidebar toggle, header user, confirm dialogs
│       ├── auth.js          # login.html / register.html logic
│       ├── dashboard.js     # dashboard.html logic + charts
│       ├── transactions.js  # transactions.html logic (CRUD, filters, pagination, modal)
│       ├── categories.js    # categories.html logic (CRUD)
│       └── settings.js      # settings.html logic (profile + password)
│
├── .gitignore
└── README.md
```

---

## Database Structure

**users** — `id`, `name`, `email` (unique), `password_hash`, `created_at`, `updated_at`

**categories** — `id`, `user_id` (FK → users), `name`, `type` (`income`/`expense`), `created_at`
Each new user automatically gets default categories:
- Expense: Food, Transportation, Rent, Bills, Shopping, Entertainment, Health, Education, Other
- Income: Salary, Freelance, Business, Gift, Investment, Other

**transactions** — `id`, `user_id` (FK → users), `category_id` (FK → categories), `type`, `amount` (`NUMERIC(12,2)`, must be > 0), `description`, `transaction_date`, `created_at`, `updated_at`

Indexes exist on `user_id`, `category_id`, and `transaction_date` on the `transactions` table, and on `email` on `users`, for query performance.

---

## API Endpoints

All endpoints under `/api` except registration/login require `Authorization: Bearer <token>`.

**Auth**
- `POST /api/auth/register` — create account (also seeds default categories)
- `POST /api/auth/login` — returns `{ access_token, token_type }`
- `GET /api/auth/me` — current user profile
- `PUT /api/auth/me` — update name
- `POST /api/auth/change-password` — change password

**Categories**
- `GET /api/categories`
- `POST /api/categories`
- `PUT /api/categories/{id}`
- `DELETE /api/categories/{id}` — blocked (409) if the category still has transactions

**Transactions**
- `GET /api/transactions?type=&category_id=&start_date=&end_date=&search=&page=&limit=`
- `GET /api/transactions/{id}`
- `POST /api/transactions`
- `PUT /api/transactions/{id}`
- `DELETE /api/transactions/{id}`

**Dashboard**
- `GET /api/dashboard/summary` → `{ total_income, total_expenses, balance }`
- `GET /api/dashboard/recent-transactions`
- `GET /api/dashboard/expenses-by-category`
- `GET /api/dashboard/monthly-summary`

Interactive docs are auto-generated by FastAPI at `/docs` (Swagger UI) and `/redoc`.

---

## Installation & Setup

### 1. Backend

```bash
cd backend
python -m venv venv

# Activate the virtual environment
# macOS/Linux:
source venv/bin/activate
# Windows:
venv\Scripts\activate

pip install -r requirements.txt
```

### 2. Environment Variables

```bash
cp .env.example .env
```

Then edit `backend/.env`:

```
DATABASE_URL=postgresql+psycopg://username:password@host:5432/database
SECRET_KEY=replace-with-a-long-random-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
ALLOWED_ORIGINS=http://127.0.0.1:5500,http://localhost:5500
```

For **Supabase**: grab the Postgres connection string from your Supabase project's
Database settings and use it as `DATABASE_URL`, in the form:
`postgresql+psycopg://postgres:<password>@<project-ref>.supabase.co:5432/postgres`

If you don't set `DATABASE_URL` at all, the app automatically falls back to a local
SQLite file (`herbudget.db`) so you can try it without setting up Postgres first.

### 3. Database Setup & Migrations

```bash
cd backend
alembic upgrade head
```

To generate a new migration after changing models:

```bash
alembic revision --autogenerate -m "describe your change"
alembic upgrade head
```

### 4. Run the Backend

```bash
uvicorn app.main:app --reload
```

- API: http://127.0.0.1:8000
- Swagger docs: http://127.0.0.1:8000/docs
- ReDoc: http://127.0.0.1:8000/redoc

### 5. Run the Frontend

The frontend is static HTML/CSS/JS — no build step. Serve it with any static
file server, for example:

```bash
cd frontend
python -m http.server 5500
```

Then open http://127.0.0.1:5500 in your browser. Make sure the origin you
serve the frontend from is included in `ALLOWED_ORIGINS` in `backend/.env`.

If your backend runs somewhere other than `http://127.0.0.1:8000`, update
`API_BASE_URL` at the top of `frontend/js/api.js`.

### 6. Run Tests

```bash
cd backend
pytest -v
```

All 28 tests should pass (auth, transactions, dashboard, validation, and
cross-user data isolation).

---

## Security Notes

- Passwords are hashed with bcrypt, never stored in plain text
- JWT tokens are required for all endpoints except register/login
- Every transaction/category query is filtered by the authenticated user's ID — a user can never read, edit, or delete another user's data (covered by tests)
- All input is validated with Pydantic on the backend; the frontend also validates for a better UX, but the backend is the real gatekeeper
- Secrets are read from environment variables — nothing is hard-coded, and `.env` is git-ignored
- CORS origins are configurable via `ALLOWED_ORIGINS`, not wide open with `*`

---

## Known Limitations (MVP scope)

This MVP intentionally does **not** include: bank/mobile-money integration,
payment processing, multi-currency support, recurring transactions,
budgets/savings goals, CSV/PDF export, or an admin dashboard.

## Future Improvements

- Monthly budgets and savings goals
- Recurring transactions
- Export to CSV/PDF
- Email notifications
- Native mobile app
- AI-powered spending insights
- Bank/mobile-money integration
- Multi-currency accounting
- Dark mode
- Advanced analytics/reports
