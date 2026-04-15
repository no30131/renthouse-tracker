from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Database
    DATABASE_URL: str

    # Auth
    ADMIN_USERNAME: str
    ADMIN_PASSWORD_HASH: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # External APIs
    GOOGLE_API_KEY: str
    MAPBOX_TOKEN: str

    # Webhook
    WEBHOOK_SECRET: str

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    # 排程爬蟲（只留開關，其餘條件設定在 crawler_config.py）
    CRAWLER_ENABLED: bool = False


settings = Settings()
