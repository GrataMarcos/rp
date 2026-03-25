"""
Sesiones de conversación respaldadas por Supabase (tabla whatsapp_sessions).
Usa el service role key para bypasear RLS — mismo patrón que supabase_service.py.
"""

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import requests

logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")
SESSION_TTL_SECONDS = int(os.environ.get("SESSION_TTL_SECONDS", "1800"))

_HEADERS = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Prefer": "return=representation",
}


def _url() -> str:
    return f"{SUPABASE_URL}/rest/v1/whatsapp_sessions"


def get_session(phone: str) -> dict:
    """Retrieve session state for a phone number."""
    try:
        resp = requests.get(
            _url(),
            headers=_HEADERS,
            params={"phone": f"eq.{phone}", "select": "state,pending_data,expires_at", "limit": 1},
            timeout=5,
        )
        if resp.status_code == 200:
            rows = resp.json()
            if rows:
                row = rows[0]
                # Check expiry
                expires_at = row.get("expires_at", "")
                if expires_at:
                    exp = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                    if exp <= datetime.now(timezone.utc):
                        clear_session(phone)
                        return {"state": "idle", "pending_expense": None}
                return {
                    "state": row.get("state", "idle"),
                    "pending_expense": row.get("pending_data"),
                }
    except Exception as e:
        logger.error("get_session error: %s", e)
    return {"state": "idle", "pending_expense": None}


def set_session(phone: str, session: dict) -> None:
    """Upsert session state for a phone number."""
    try:
        expires_at = (
            datetime.now(timezone.utc) + timedelta(seconds=SESSION_TTL_SECONDS)
        ).isoformat()

        payload = {
            "phone": phone,
            "state": session["state"],
            "pending_data": session.get("pending_expense"),
            "expires_at": expires_at,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }

        # Upsert (insert or update on conflict)
        requests.post(
            _url(),
            headers={**_HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
            json=payload,
            timeout=5,
        )
    except Exception as e:
        logger.error("set_session error: %s", e)


def clear_session(phone: str) -> None:
    """Delete session for a phone number."""
    try:
        requests.delete(
            _url(),
            headers=_HEADERS,
            params={"phone": f"eq.{phone}"},
            timeout=5,
        )
    except Exception as e:
        logger.error("clear_session error: %s", e)
