"""
Alert channels — e-mail via Resend en generieke webhook.
Elke channel is een losse functie zodat ze onafhankelijk aan/uit gezet kunnen worden.
"""

import logging
import requests
import resend
from app.core.config import settings
from app.models.incident import Incident

logger = logging.getLogger(__name__)


def _build_message(incident: Incident, dataset_name: str) -> dict:
    """Bouw een gestructureerd bericht op basis van het incident."""
    severity_label = "CRITICAL" if incident.severity.value == "critical" else "WARNING"
    type_labels = {
        "refresh_failed": "Dataset refresh failed",
        "refresh_delayed": "Dataset refresh delayed",
        "schema_change": "Schema change detected",
    }
    type_label = type_labels.get(incident.type, incident.type)

    return {
        "severity": severity_label,
        "type_label": type_label,
        "dataset_name": dataset_name,
        "root_cause": incident.root_cause_hint or "No hint available",
        "detail": incident.detail or "",
        "incident_url": f"{settings.app_url}/pipelines/{incident.dataset_id}?tab=issues",
        "incident_id": incident.id[:8],
    }


def send_email(incident: Incident, dataset_name: str) -> bool:
    """Verstuurt een e-mail alert via Resend."""
    if not settings.resend_api_key or not settings.alert_email_to:
        logger.debug("E-mail niet geconfigureerd — sla over.")
        return False

    msg = _build_message(incident, dataset_name)
    resend.api_key = settings.resend_api_key

    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: {'#b91c1c' if msg['severity'] == 'CRITICAL' else '#92400e'};
                    color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
            <strong>[{msg['severity']}] {msg['type_label']}</strong>
        </div>
        <div style="background: #1c1c1e; color: #d8d9da; padding: 24px; border-radius: 0 0 8px 8px;">
            <p><strong>Dataset:</strong> {msg['dataset_name']}</p>
            <p><strong>Root cause:</strong> {msg['root_cause']}</p>
            {'<p><strong>Detail:</strong> ' + msg['detail'] + '</p>' if msg['detail'] else ''}
            <br>
            <a href="{msg['incident_url']}"
               style="background: #00b4d8; color: white; padding: 10px 20px;
                      border-radius: 6px; text-decoration: none; display: inline-block;">
                View incident →
            </a>
            <p style="color: #6e7180; font-size: 12px; margin-top: 24px;">
                Incident #{msg['incident_id']} · Pulse by WNK Data Consultancy
            </p>
        </div>
    </div>
    """

    try:
        resend.Emails.send({
            "from": settings.get_alert_email_from(),
            "to": [settings.alert_email_to],
            "subject": f"[{msg['severity']}] {msg['type_label']} — {msg['dataset_name']}",
            "html": html,
        })
        logger.info(f"E-mail alert verstuurd voor incident {incident.id[:8]}")
        return True
    except Exception as e:
        logger.error(f"E-mail versturen mislukt: {e}")
        return False


def send_telegram(incident: Incident, dataset_name: str) -> bool:
    """Verstuurt een Telegram bericht via de Bot API."""
    if not settings.alert_telegram_bot_token or not settings.alert_telegram_chat_id:
        logger.debug("Telegram niet geconfigureerd — sla over.")
        return False

    msg = _build_message(incident, dataset_name)
    severity_emoji = "🔴" if msg["severity"] == "CRITICAL" else "🟡"

    text = (
        f"{severity_emoji} *[{msg['severity']}] {msg['type_label']}*\n\n"
        f"*Dataset:* {msg['dataset_name']}\n"
        f"*Root cause:* {msg['root_cause']}\n"
        + (f"*Detail:* {msg['detail']}\n" if msg["detail"] else "")
        + f"\n[View incident]({msg['incident_url']})"
    )

    try:
        r = requests.post(
            f"https://api.telegram.org/bot{settings.alert_telegram_bot_token}/sendMessage",
            json={
                "chat_id": settings.alert_telegram_chat_id,
                "text": text,
                "parse_mode": "Markdown",
                "disable_web_page_preview": True,
            },
            timeout=10,
        )
        r.raise_for_status()
        logger.info(f"Telegram alert verstuurd voor incident {incident.id[:8]}")
        return True
    except Exception as e:
        logger.error(f"Telegram versturen mislukt: {e}")
        return False


def send_webhook(incident: Incident, dataset_name: str) -> bool:
    """
    Verstuurt een webhook naar een geconfigureerde URL.
    Werkt met Teams, Slack, Telegram bots, PagerDuty, of elke HTTP endpoint.
    """
    if not settings.alert_webhook_url:
        logger.debug("Webhook niet geconfigureerd — sla over.")
        return False

    msg = _build_message(incident, dataset_name)

    # Generiek payload — werkt als basis voor de meeste webhook ontvangers
    payload = {
        "severity": msg["severity"],
        "type": msg["type_label"],
        "dataset": msg["dataset_name"],
        "root_cause": msg["root_cause"],
        "detail": msg["detail"],
        "incident_url": msg["incident_url"],
        "incident_id": msg["incident_id"],
        # Microsoft Teams Adaptive Card formaat (werkt ook als fallback tekst)
        "text": f"**[{msg['severity']}] {msg['type_label']}**\n\n"
                f"Dataset: {msg['dataset_name']}\n"
                f"Root cause: {msg['root_cause']}\n\n"
                f"[View incident]({msg['incident_url']})",
    }

    try:
        r = requests.post(
            settings.alert_webhook_url,
            json=payload,
            timeout=10,
            headers={"Content-Type": "application/json"},
        )
        r.raise_for_status()
        logger.info(f"Webhook alert verstuurd voor incident {incident.id[:8]}")
        return True
    except Exception as e:
        logger.error(f"Webhook versturen mislukt: {e}")
        return False
