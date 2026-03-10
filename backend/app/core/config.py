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

    # Operational monitoring
    healthchecks_ping_url: str = ""  # e.g. https://hc-ping.com/{uuid} — ping after each successful sync cycle

    # Alerts
    resend_api_key: str = ""
    alert_email_to: str = ""
    alert_email_from: str = "Pulse Alerts <alerts@pulse.wnkdata.nl>"
    alert_webhook_url: str = ""  # Teams, Slack, of elke HTTP webhook
    alert_telegram_bot_token: str = ""
    alert_telegram_chat_id: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
