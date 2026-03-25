"""
Supabase integration for FinanzasYa WhatsApp bot.
Uses the service role key to bypass RLS and write transactions
on behalf of users identified by their WhatsApp phone number.
"""

import json
import logging
import os
from functools import lru_cache
from typing import Optional

import requests

logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

_HEADERS = {
    "Content-Type": "application/json",
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Prefer": "return=representation",
}


def _url(path: str) -> str:
    return f"{SUPABASE_URL}/rest/v1/{path}"


# ─── User lookup ─────────────────────────────────────────────────────────────

def get_user_by_whatsapp(phone: str) -> Optional[dict]:
    """Find a profile by WhatsApp phone number (normalized)."""
    # Normalize: strip spaces/dashes, keep + prefix
    normalized = "+" + phone.lstrip("+").replace(" ", "").replace("-", "")

    resp = requests.get(
        _url("profiles"),
        headers=_HEADERS,
        params={
            "whatsapp_phone": f"eq.{normalized}",
            "select": "id,default_currency,experience_level",
            "limit": 1,
        },
        timeout=10,
    )

    if resp.status_code == 200:
        rows = resp.json()
        return rows[0] if rows else None

    logger.error("Supabase user lookup failed: %s %s", resp.status_code, resp.text)
    return None


# ─── Category lookup ──────────────────────────────────────────────────────────

@lru_cache(maxsize=128)
def get_user_categories(user_id: str) -> list[dict]:
    """Return all categories for a user (cached per Lambda warm instance)."""
    resp = requests.get(
        _url("categories"),
        headers=_HEADERS,
        params={
            "user_id": f"eq.{user_id}",
            "select": "id,name,emoji,type",
        },
        timeout=10,
    )
    if resp.status_code == 200:
        return resp.json()
    return []


def find_category_id(user_id: str, category_name: str) -> Optional[str]:
    """Match a category name (from GPT) to a user category ID."""
    if not category_name:
        return None

    categories = get_user_categories(user_id)
    cat_lower = category_name.lower().strip()

    # Exact match first
    for cat in categories:
        if cat["name"].lower() == cat_lower:
            return cat["id"]

    # Partial match
    for cat in categories:
        if cat_lower in cat["name"].lower() or cat["name"].lower() in cat_lower:
            return cat["id"]

    return None


# ─── Transaction insert ───────────────────────────────────────────────────────

def save_transaction(
    user_id: str,
    transaction_type: str,        # 'income' or 'expense'
    amount: float,
    currency: str,
    description: Optional[str],
    category_name: Optional[str],
    date: str,                    # 'YYYY-MM-DD'
) -> Optional[dict]:
    """Insert a transaction into Supabase. Returns the created row or None."""
    category_id = find_category_id(user_id, category_name) if category_name else None

    payload = {
        "user_id": user_id,
        "type": transaction_type,
        "amount": round(float(amount), 2),
        "currency": currency.upper(),
        "description": description or None,
        "category_id": category_id,
        "date": date,
        "source": "whatsapp",
    }

    resp = requests.post(
        _url("transactions"),
        headers=_HEADERS,
        json=payload,
        timeout=10,
    )

    if resp.status_code in (200, 201):
        rows = resp.json()
        return rows[0] if rows else payload

    logger.error("Supabase transaction insert failed: %s %s", resp.status_code, resp.text)
    return None


# ─── Monthly summary (for /resumen command) ───────────────────────────────────

def get_monthly_summary(user_id: str, year: int, month: int, currency: str) -> dict:
    """Return income/expense/savings totals for a given month."""
    from_date = f"{year:04d}-{month:02d}-01"
    import calendar
    last_day = calendar.monthrange(year, month)[1]
    to_date = f"{year:04d}-{month:02d}-{last_day:02d}"

    resp = requests.get(
        _url("transactions"),
        headers=_HEADERS,
        params={
            "user_id": f"eq.{user_id}",
            "currency": f"eq.{currency}",
            "date": f"gte.{from_date}",
            "and": f"(date.lte.{to_date})",
            "select": "type,amount",
        },
        timeout=10,
    )

    if resp.status_code != 200:
        return {"income": 0, "expenses": 0, "savings": 0}

    txs = resp.json()
    income = sum(t["amount"] for t in txs if t["type"] == "income")
    expenses = sum(t["amount"] for t in txs if t["type"] == "expense")

    return {"income": income, "expenses": expenses, "savings": income - expenses}


def get_recent_transactions(user_id: str, limit: int = 5) -> list[dict]:
    """Return last N transactions for the user."""
    resp = requests.get(
        _url("transactions"),
        headers=_HEADERS,
        params={
            "user_id": f"eq.{user_id}",
            "select": "type,amount,currency,description,date,category:categories(name,emoji)",
            "order": "date.desc,created_at.desc",
            "limit": limit,
        },
        timeout=10,
    )
    if resp.status_code == 200:
        return resp.json()
    return []
