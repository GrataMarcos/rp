from services.whatsapp import send_message, send_button_message
from services.openai_service import parse_expense
from services.sheets import add_expense
from utils.session import get_session, set_session, clear_session
from utils.categories import get_category

_CONFIRM = {"sí", "si", "yes", "ok", "dale", "confirmar", "confirmo", "listo", "👍", "correcto"}
_CANCEL  = {"no", "nope", "cancelar", "cancel", "salir", "👎"}


def handle_text(phone: str, text: str) -> None:
    session = get_session(phone)

    if session["state"] == "confirming" and session.get("pending_expense"):
        _handle_confirmation(phone, text.strip(), session)
    else:
        _process_expense_text(phone, text.strip())


def _process_expense_text(phone: str, text: str) -> None:
    send_message(phone, "⏳ Procesando...")

    try:
        expense = parse_expense(text)
    except Exception as e:
        print(f"[openai] parse_expense error: {e}")
        send_message(phone, "❌ Error al consultar la IA. Intentá de nuevo en unos segundos.")
        return

    if not expense.get("is_expense"):
        send_message(
            phone,
            "🤔 No detecté un gasto en ese mensaje.\n\n"
            "Ejemplos válidos:\n"
            '• "gasté 1500 en pizza"\n'
            '• "taxi 800"\n'
            '• "Netflix 15 dólares"\n\n'
            "Para ver comandos disponibles enviá /ayuda",
        )
        return

    set_session(phone, {"state": "confirming", "pending_expense": expense})

    cat_info = get_category(expense.get("category", "otros"))
    amount = expense.get("amount", 0)
    currency = expense.get("currency", "ARS")
    desc = expense.get("description", "")
    exp_date = expense.get("date", "")

    confirm_text = (
        f"✅ *¿Registro este gasto?*\n\n"
        f"💰 Monto: ${amount:,.2f} {currency}\n"
        f"{cat_info['emoji']} Categoría: {cat_info['label']}\n"
        f"📝 Descripción: {desc}\n"
        f"📅 Fecha: {exp_date}\n\n"
        f"Respondé *Sí* para guardar o *No* para cancelar.\n"
        f"Si hay un error, reescribí el gasto y lo re-proceso."
    )

    send_button_message(phone, confirm_text, ["Sí", "No"])


# Expuesto para que audio_handler lo pueda llamar directamente
process_expense_text = _process_expense_text


def _handle_confirmation(phone: str, text: str, session: dict) -> None:
    lower = text.lower()

    if any(lower == w or lower.startswith(w + " ") for w in _CONFIRM):
        expense = session["pending_expense"]
        try:
            add_expense(expense)
            clear_session(phone)
            cat_info = get_category(expense.get("category", "otros"))
            send_message(
                phone,
                f"✅ *Gasto guardado en Google Sheets*\n\n"
                f"{cat_info['emoji']} {expense.get('description')}\n"
                f"💰 ${expense.get('amount', 0):,.2f} {expense.get('currency', 'ARS')}\n"
                f"📅 {expense.get('date')}",
            )
        except Exception as e:
            print(f"[sheets] add_expense error: {e}")
            send_message(phone, "❌ No pude guardar en Google Sheets. Verificá la configuración.")

    elif any(lower == w for w in _CANCEL):
        clear_session(phone)
        send_message(phone, "❌ Gasto cancelado. Podés registrar uno nuevo cuando quieras.")

    else:
        # Tratar como corrección: re-parsear
        clear_session(phone)
        _process_expense_text(phone, text)
