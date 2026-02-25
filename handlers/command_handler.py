import os

from services.whatsapp import send_message
from services.sheets import get_recent_expenses, get_monthly_summary
from utils.categories import CATEGORIES, get_category
from utils.session import clear_session

HELP_TEXT = """🤖 *Bot de Gastos — Ayuda*

*Registrar un gasto:*
Enviá un mensaje de texto o una nota de voz describiendo el gasto.
Ejemplos:
  • "gasté 1500 en pizza"
  • "taxi 800 pesos"
  • "Netflix 15 dólares"
  • "supermercado 12400"

*Comandos:*
/resumen — Resumen del mes actual
/recientes — Últimos 5 gastos registrados
/categorias — Ver categorías disponibles
/cancelar — Cancelar operación en curso
/ayuda — Mostrar esta ayuda

*Notas de voz:*
Podés enviar un audio y el bot lo transcribe automáticamente 🎤"""


def handle_command(phone: str, command: str) -> None:
    cmd = command.strip().lower().split()[0]

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
        case "/categorias" | "/categories":
            _handle_categories(phone)
        case _:
            send_message(phone, "❓ Comando desconocido. Enviá /ayuda para ver los disponibles.")


def _handle_summary(phone: str) -> None:
    send_message(phone, "⏳ Calculando resumen...")

    from datetime import datetime
    now = datetime.now()
    month_label = now.strftime("%B %Y").capitalize()

    data = get_monthly_summary()
    summary = data["summary"]
    count = data["count"]

    if count == 0:
        send_message(phone, f"📊 No hay gastos registrados en {month_label}.")
        return

    msg = f"📊 *Resumen de {month_label}*\nTotal de transacciones: {count}\n"

    for currency, info in summary.items():
        total = info["total"]
        msg += f"\n*{currency}* — Total: ${total:,.2f}\n"

        sorted_cats = sorted(info["categories"].items(), key=lambda x: x[1], reverse=True)
        for cat, amount in sorted_cats:
            cat_info = get_category(cat)
            pct = (amount / total * 100) if total else 0
            msg += f"  {cat_info['emoji']} {cat_info['label']}: ${amount:,.2f} ({pct:.1f}%)\n"

    send_message(phone, msg)


def _handle_recent(phone: str) -> None:
    send_message(phone, "⏳ Buscando gastos recientes...")

    rows = get_recent_expenses(5)
    if not rows:
        send_message(phone, "📝 No hay gastos registrados aún. ¡Registrá tu primer gasto!")
        return

    msg = "📋 *Últimos gastos:*\n\n"
    for i, row in enumerate(rows, 1):
        cat_info = get_category(row[3] if len(row) > 3 else "otros")
        desc = row[4] if len(row) > 4 else "Sin descripción"
        amount = float(row[1]) if len(row) > 1 else 0
        currency = row[2] if len(row) > 2 else ""
        date = row[0] if row else ""
        msg += f"{i}. {cat_info['emoji']} *{desc}*\n"
        msg += f"   💰 ${amount:,.2f} {currency}\n"
        msg += f"   📅 {date}\n\n"

    send_message(phone, msg.strip())


def _handle_categories(phone: str) -> None:
    msg = "📂 *Categorías disponibles:*\n\n"
    for info in CATEGORIES.values():
        msg += f"{info['emoji']} {info['label']}\n"
    msg += "\nEl bot detecta la categoría automáticamente según tu descripción."
    send_message(phone, msg)
