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

    # App domain (used for alert URLs, CORS, email sender)
    app_domain: str = "pulse.wnkdata.nl"
    app_url: str = "https://pulse.wnkdata.nl"
    cors_origin: str = "http://localhost:3000"

    # Auth
    jwt_secret: str = "change-me-in-production"  # override via JWT_SECRET in .env

    # Encryption (Fernet) — used for Power BI client secrets at rest
    encryption_key: str = ""  # generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

    # Alerts
    resend_api_key: str = ""
    alert_email_to: str = ""
    alert_email_from: str = ""  # defaults to "Pulse Alerts <alerts@{app_domain}>" if empty
    alert_webhook_url: str = ""  # Teams, Slack, of elke HTTP webhook
    alert_telegram_bot_token: str = ""
    alert_telegram_chat_id: str = ""

    def get_alert_email_from(self) -> str:
        if self.alert_email_from:
            return self.alert_email_from
        return f"Pulse Alerts <alerts@{self.app_domain}>"

    def get_auth_email_from(self) -> str:
        return f"Pulse <noreply@{self.app_domain}>"

    class Config:
        env_file = ".env"


settings = Settings()
