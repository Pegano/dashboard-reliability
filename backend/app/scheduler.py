"""
Scheduler process — draait los van de API server.
Start met: python -m app.scheduler
"""

import logging
import time
import urllib.request
from apscheduler.schedulers.blocking import BlockingScheduler
from app.core.config import settings
from app.core.database import SessionLocal
from app.connectors.powerbi.sync import sync_all
from app.detection.checks import run_all_checks
from app.alerts.service import send_alerts_for_incidents

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

scheduler = BlockingScheduler()


@scheduler.scheduled_job("interval", minutes=settings.poll_interval_minutes)
def poll_job():
    logger.info("Poll cyclus gestart")
    db = SessionLocal()
    try:
        sync_all(db)
        incidents = run_all_checks(db)
        if incidents:
            logger.info(f"{len(incidents)} incident(en) gedetecteerd")
            send_alerts_for_incidents(db, incidents)
        # Heartbeat — signals successful cycle to dead-man's-switch monitor
        if settings.healthchecks_ping_url:
            try:
                urllib.request.urlopen(settings.healthchecks_ping_url, timeout=5)
            except Exception:
                pass  # never let a monitoring ping failure break the scheduler
    except Exception as e:
        logger.error(f"Poll cyclus mislukt: {e}", exc_info=True)
        # Signal failure to monitor
        if settings.healthchecks_ping_url:
            try:
                urllib.request.urlopen(settings.healthchecks_ping_url + "/fail", timeout=5)
            except Exception:
                pass
    finally:
        db.close()


if __name__ == "__main__":
    logger.info(f"Scheduler gestart — poll interval: {settings.poll_interval_minutes} minuten")
    poll_job()  # direct één keer draaien bij opstarten
    scheduler.start()
