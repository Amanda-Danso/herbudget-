"""
Application configuration.
Loads settings from environment variables (.env file in development).
Never hard-code secrets here — always read them from the environment.
"""
import os
from functools import lru_cache

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


class Settings:
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./herbudget.db",  # fallback for quick local testing only
    )

    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-this-secret")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
    )

    ALLOWED_ORIGINS: list = [
        origin.strip()
        for origin in os.getenv(
            "ALLOWED_ORIGINS",
            "http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:5173,http://localhost:5173",
        ).split(",")
        if origin.strip()
    ]

    APP_NAME: str = "HerBudget API"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
