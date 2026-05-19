from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://keel:keel@localhost:5432/keel"
    rabbitmq_url: str = "amqp://guest:guest@localhost:5672/"
    redis_url: str = "redis://localhost:6379"

    s3_endpoint: str = "http://localhost:9000"
    s3_bucket: str = "keel-documents"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"

    keycloak_url: str = "http://localhost:8080"
    keycloak_realm: str = "keel"
    keycloak_client_id: str = "keel-api"
    keycloak_client_secret: str = "change-me-in-production"

    anthropic_api_key: str = ""
    resend_api_key: str = ""


settings = Settings()
