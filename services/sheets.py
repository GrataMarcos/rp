import json
import os
from datetime import datetime, timezone
from functools import lru_cache

from google.oauth2 import service_account
from googleapiclient.discovery import build

_SPREADSHEET_ID = os.environ["GOOGLE_SPREADSHEET_ID"]
_SHEET_NAME = os.environ.get("GOOGLE_SHEET_NAME", "Gastos")
_SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
_HEADERS = ["Fecha", "Monto", "Moneda", "Categoría", "Descripción", "Registrado en"]
_TZ = os.environ.get("TIMEZONE", "America/Argentina/Buenos_Aires")


@lru_cache(maxsize=1)
def _get_service():
    """Crea y cachea el cliente de Google Sheets (reutilizable entre invocaciones calientes)."""
    creds_json = os.environ.get("GOOGLE_CREDENTIALS_JSON")
    if creds_json:
        creds_info = json.loads(creds_json)
    else:
        creds_path = os.environ.get("GOOGLE_CREDENTIALS_PATH", "credentials.json")
        with open(creds_path) as f:
            creds_info = json.load(f)

    credentials = service_account.Credentials.from_service_account_info(
        creds_info, scopes=_SCOPES
    )
    return build("sheets", "v4", credentials=credentials, cache_discovery=False)


def _ensure_headers() -> None:
    service = _get_service()
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=_SPREADSHEET_ID, range=f"{_SHEET_NAME}!A1:F1")
        .execute()
    )
    existing = (result.get("values") or [[]])[0]
    if not existing or existing[0] != _HEADERS[0]:
        service.spreadsheets().values().update(
            spreadsheetId=_SPREADSHEET_ID,
            range=f"{_SHEET_NAME}!A1:F1",
            valueInputOption="USER_ENTERED",
            body={"values": [_HEADERS]},
        ).execute()


def add_expense(expense: dict) -> None:
    _ensure_headers()
    service = _get_service()

    now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    row = [
        expense["date"],
        expense["amount"],
        expense["currency"],
        expense["category"],
        expense["description"],
        now_str,
    ]

    service.spreadsheets().values().append(
        spreadsheetId=_SPREADSHEET_ID,
        range=f"{_SHEET_NAME}!A:F",
        valueInputOption="USER_ENTERED",
        insertDataOption="INSERT_ROWS",
        body={"values": [row]},
    ).execute()


def get_recent_expenses(limit: int = 5) -> list[list]:
    """Retorna los últimos `limit` gastos (más reciente primero)."""
    service = _get_service()
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=_SPREADSHEET_ID, range=f"{_SHEET_NAME}!A:F")
        .execute()
    )
    rows = (result.get("values") or [])[1:]  # Sin headers
    return list(reversed(rows[-limit:]))


def get_monthly_summary() -> dict:
    """Retorna totales del mes actual agrupados por moneda y categoría."""
    service = _get_service()
    result = (
        service.spreadsheets()
        .values()
        .get(spreadsheetId=_SPREADSHEET_ID, range=f"{_SHEET_NAME}!A:F")
        .execute()
    )
    rows = (result.get("values") or [])[1:]

    now = datetime.now()
    month_prefix = f"{now.year}-{now.month:02d}"

    month_rows = [r for r in rows if r and r[0].startswith(month_prefix)]

    summary: dict[str, dict] = {}
    for row in month_rows:
        try:
            amount = float(row[1])
            currency = row[2] if len(row) > 2 else os.environ.get("DEFAULT_CURRENCY", "ARS")
            category = row[3] if len(row) > 3 else "otros"
        except (ValueError, IndexError):
            continue

        if currency not in summary:
            summary[currency] = {"total": 0.0, "categories": {}}
        summary[currency]["total"] += amount
        summary[currency]["categories"][category] = (
            summary[currency]["categories"].get(category, 0.0) + amount
        )

    return {"summary": summary, "count": len(month_rows)}
