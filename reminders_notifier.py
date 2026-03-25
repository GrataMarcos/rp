"""
FinanzasYa — Reminders Notifier Lambda
=======================================
Trigger: AWS EventBridge cron  →  cron(0 12 * * ? *)   # 9am Argentina (UTC-3)

Para cada recordatorio activo con vencimiento próximo (dentro de notify_days_before días)
que tenga notify_whatsapp=true y un número vinculado, envía un mensaje de WhatsApp.

Configuración en AWS Lambda:
  Handler  : reminders_notifier.lambda_handler
  Runtime  : Python 3.12
  Timeout  : 60 segundos
  Env vars : SUPABASE_URL, SUPABASE_SERVICE_KEY, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID
"""

import json
import logging
from datetime import date, timedelta
from calendar import monthrange

from services.supabase_service import get_due_reminders, update_reminder_after_notification
from services.whatsapp import send_message

logger = logging.getLogger(__name__)


def _next_due_date(current: str, recurrence: str) -> str:
    """Calculate next due date after notifying/paying a reminder."""
    d = date.fromisoformat(current)

    if recurrence == "monthly":
        # Same day next month
        month = d.month % 12 + 1
        year = d.year + (d.month // 12)
        max_day = monthrange(year, month)[1]
        return date(year, month, min(d.day, max_day)).isoformat()

    elif recurrence == "yearly":
        try:
            return date(d.year + 1, d.month, d.day).isoformat()
        except ValueError:
            return date(d.year + 1, d.month, 28).isoformat()

    else:
        # one-time: deactivate (return far future to avoid re-triggering)
        return date(9999, 12, 31).isoformat()


def _format_amount(amount, currency) -> str:
    if amount is None:
        return ""
    try:
        return f" por ${float(amount):,.2f} {currency}"
    except (ValueError, TypeError):
        return ""


def lambda_handler(event, context):
    logger.info("Reminders notifier started")
    reminders = get_due_reminders(days_ahead=3)
    sent = 0
    errors = 0

    for reminder in reminders:
        try:
            profile = reminder.get("profile") or {}
            whatsapp_phone = (
                profile.get("whatsapp_phone") if isinstance(profile, dict) else None
            )

            if not whatsapp_phone:
                logger.info("Skipping reminder %s — no WhatsApp phone", reminder.get("id"))
                continue

            due_date = reminder.get("next_due_date", "")
            days_left = (date.fromisoformat(due_date) - date.today()).days if due_date else 0

            if days_left < 0:
                urgency = f"⚠️ *VENCIDO hace {abs(days_left)} día{'s' if abs(days_left) != 1 else ''}*"
            elif days_left == 0:
                urgency = "🔴 *Vence HOY*"
            elif days_left == 1:
                urgency = "🟠 *Vence mañana*"
            else:
                urgency = f"🟡 Vence en *{days_left} días* ({due_date})"

            amount_str = _format_amount(reminder.get("amount"), reminder.get("currency", "ARS"))

            message = (
                f"🔔 *Recordatorio: {reminder.get('title')}*\n\n"
                f"{urgency}\n"
                f"{amount_str}\n\n"
                f"Podés ver y gestionar tus recordatorios en FinanzasYa."
            ).strip()

            send_message(whatsapp_phone, message)
            logger.info("Sent reminder to %s for '%s'", whatsapp_phone, reminder.get("title"))

            # Update last_notified_at and calculate next due date
            recurrence = reminder.get("recurrence", "monthly")
            next_date = _next_due_date(due_date, recurrence) if due_date else due_date

            # For one-time reminders, deactivate after sending
            if recurrence == "one-time":
                from services.supabase_service import _url, _HEADERS
                import requests
                requests.patch(
                    _url("reminders"),
                    headers={**_HEADERS, "Prefer": "return=minimal"},
                    params={"id": f"eq.{reminder['id']}"},
                    json={"is_active": False},
                    timeout=10,
                )
            else:
                update_reminder_after_notification(reminder["id"], next_date)

            sent += 1

        except Exception as e:
            logger.error("Error processing reminder %s: %s", reminder.get("id"), e)
            errors += 1

    logger.info("Reminders notifier done: %d sent, %d errors", sent, errors)
    return {"statusCode": 200, "body": json.dumps({"sent": sent, "errors": errors})}
