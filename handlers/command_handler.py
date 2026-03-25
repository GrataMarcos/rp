import os
from datetime import datetime

from services.whatsapp import send_message, send_button_message
from services.supabase_service import (
    get_user_by_whatsapp,
    get_monthly_summary,
    get_recent_transactions,
    get_user_groups,
    delete_transaction,
)
from utils.categories import CATEGORIES, get_category
from utils.session import clear_session, get_session, set_session

HELP_TEXT = """🤖 *FinanzasYa Bot — Ayuda*

*Registrar un gasto:*
Enviá un mensaje de texto o una nota de voz describiendo el movimiento.
Ejemplos:
  • "gasté 1500 en pizza"
  • "taxi 800 pesos"
  • "cobré 200000 de sueldo"
  • "Netflix 15 dólares"

*Comandos:*
/resumen — Resumen del mes actual
/recientes — Últimas 5 transacciones
/eliminar [n] — Eliminar transacción N de /recientes
/grupos — Ver tus grupos
/categorias — Ver categorías disponibles
/cancelar — Cancelar operación en curso
/ayuda — Mostrar esta ayuda

*Notas de voz:*
Podés enviar un audio y el bot lo transcribe automáticamente 🎤"""


def handle_command(phone: str, command: str) -> None:
    parts = command.strip().lower().split()
    cmd = parts[0]

    match cmd:
        case "/ayuda" | "/help":
            send_message(phone, HELP_TEXT)
        case "/cancelar" | "/cancel":
            clear_session(phone)
            send_message(phone, "❌ Operación cancelada.")
        case "/resumen" | "/summary":
            _handle_summary(phone)
        case "/recientes" | "/recent":
            _handle_recent(phone)
        case "/eliminar" | "/delete":
            n = int(parts[1]) if len(parts) > 1 and parts[1].isdigit() else None
            _handle_delete(phone, n)
        case "/grupos" | "/groups":
            _handle_groups(phone)
        case "/categorias" | "/categories":
            _handle_categories(phone)
        case _:
            send_message(phone, "❓ Comando desconocido. Enviá /ayuda para ver los disponibles.")


def _handle_summary(phone: str) -> None:
    send_message(phone, "⏳ Calculando resumen...")

    user = get_user_by_whatsapp(phone)
    if not user:
        send_message(phone, "⚠️ Tu número no está vinculado. Configuralo en la app.")
        return

    now = datetime.now()
    month_label = now.strftime("%B %Y").capitalize()
    data = get_monthly_summary(user["id"], now.year, now.month, user.get("default_currency", "ARS"))

    if data["income"] == 0 and data["expenses"] == 0:
        send_message(phone, f"📊 No hay transacciones en {month_label}.")
        return

    savings = data["income"] - data["expenses"]
    currency = user.get("default_currency", "ARS")
    sign = "+" if savings >= 0 else ""

    send_message(
        phone,
        f"📊 *Resumen de {month_label}*\n\n"
        f"💰 Ingresos: ${data['income']:,.2f} {currency}\n"
        f"💸 Gastos: ${data['expenses']:,.2f} {currency}\n"
        f"{'📈' if savings >= 0 else '📉'} Ahorro: {sign}${savings:,.2f} {currency}",
    )


def _handle_recent(phone: str) -> None:
    send_message(phone, "⏳ Buscando transacciones recientes...")

    user = get_user_by_whatsapp(phone)
    if not user:
        send_message(phone, "⚠️ Tu número no está vinculado. Configuralo en la app.")
        return

    rows = get_recent_transactions(user["id"], limit=5)
    if not rows:
        send_message(phone, "📝 No hay transacciones registradas aún.")
        return

    # Store IDs in session for /eliminar command
    set_session(phone, {
        "state": "idle",
        "pending_expense": {"_recent_ids": [r["id"] for r in rows]},
    })

    msg = "📋 *Últimas transacciones:*\n\n"
    for i, tx in enumerate(rows, 1):
        cat = tx.get("category") or {}
        cat_emoji = cat.get("emoji", "") if isinstance(cat, dict) else ""
        desc = tx.get("description") or cat.get("name", "Sin descripción")
        amount = float(tx.get("amount", 0))
        currency = tx.get("currency", "")
        date = tx.get("date", "")
        icon = "💰" if tx.get("type") == "income" else "💸"

        msg += f"{i}. {cat_emoji} *{desc}*\n"
        msg += f"   {icon} ${amount:,.2f} {currency} — {date}\n\n"

    msg += "Usá /eliminar [n] para borrar una de estas transacciones."
    send_message(phone, msg.strip())


def _handle_delete(phone: str, n: int | None) -> None:
    if n is None:
        send_message(phone, "⚠️ Indicá el número de la transacción. Ej: /eliminar 2\nPrimero usá /recientes.")
        return

    session = get_session(phone)
    recent_ids = (session.get("pending_expense") or {}).get("_recent_ids", [])

    if not recent_ids:
        send_message(phone, "⚠️ Primero enviá /recientes para ver las transacciones disponibles.")
        return

    if n < 1 or n > len(recent_ids):
        send_message(phone, f"⚠️ Número inválido. Elegí entre 1 y {len(recent_ids)}.")
        return

    tx_id = recent_ids[n - 1]
    user = get_user_by_whatsapp(phone)
    if not user:
        return

    # Store pending delete in session for confirmation
    expense_state = session.get("pending_expense") or {}
    set_session(phone, {
        "state": "confirming",
        "pending_expense": {
            "_action": "delete",
            "_tx_id": tx_id,
            "_user_id": user["id"],
        },
    })

    send_button_message(
        phone,
        f"🗑️ *¿Confirmás eliminar la transacción #{n}?*",
        ["Sí, eliminar", "No"],
    )


def _handle_groups(phone: str) -> None:
    user = get_user_by_whatsapp(phone)
    if not user:
        send_message(phone, "⚠️ Tu número no está vinculado. Configuralo en la app.")
        return

    groups = get_user_groups(user["id"])
    if not groups:
        send_message(phone, "📂 No pertenecés a ningún grupo.")
        return

    msg = "📂 *Tus grupos:*\n\n"
    for g in groups:
        label = "Personal" if g["is_individual"] else g["role"]
        msg += f"• {g['name']} ({label})\n"

    send_message(phone, msg.strip())


def _handle_categories(phone: str) -> None:
    msg = "📂 *Categorías disponibles:*\n\n"
    for info in CATEGORIES.values():
        msg += f"{info['emoji']} {info['label']}\n"
    msg += "\nEl bot detecta la categoría automáticamente."
    send_message(phone, msg)
