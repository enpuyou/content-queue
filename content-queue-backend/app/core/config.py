from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    REDIS_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080
    OPENAI_API_KEY: str = ""
    DISCOGS_TOKEN: str = ""
    DEBUG: bool = True

    # Feature Flags / Tuning
    SIMILARITY_THRESHOLD_CONNECTIONS: float = 0.75
    SIMILARITY_THRESHOLD_TAGS: float = 0.75

    # Email Settings (Resend HTTP API)
    RESEND_API_KEY: str = ""
    EMAILS_FROM_EMAIL: str = "noreply@read-sedi.com"
    EMAILS_FROM_NAME: str = "sed.i Team"
    FRONTEND_URL: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
