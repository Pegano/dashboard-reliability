from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Power BI
    powerbi_tenant_id: str
    powerbi_client_id: str
    powerbi_client_secret: str

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/dashboard_reliability"

    # Scheduler
    poll_interval_minutes: int = 5

    # Alerts
    slack_webhook_url: str = ""
    resend_api_key: str = ""
    alert_email_to: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
