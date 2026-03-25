from services.whatsapp import send_message, send_button_message
from services.openai_service import parse_expense
from services.sheets import add_expense
from services.supabase_service import get_user_by_whatsapp, save_transaction
from utils.session import get_session, set_session, clear_session
from utils.categories import get_category

_CONFIRM = {"sí", "si", "yes", "ok", "dale", "confirmar", "confirmo", "listo", "👍", "correcto"}
_CANCEL  = {"no", "nope", "cancelar", "cancel", "salir", "👎"}


def handle_text(phone: str, text: str) -> None:
    session = get_session(phone)

    if session["state"] == "confirming" and session.get("pending_expense"):
        _handle_confirmation(phone, text.strip(), session)
    else:
        # Also support "ingresé / cobré / recibí" for incomes
        _process_expense_text(phone, text.strip())


def _process_expense_text(phone: str, text: str) -> None:
    send_message(phone, "⏳ Procesando...")

    try:
        expense = parse_expense(text)
    except Exception as e:
        print(f"[openai] parse_expense error: {e}")
        send_message(phone, "❌ Error al consultar la IA. Intentá de nuevo en unos segundos.")
        return

    is_expense = expense.get("is_expense", False)
    is_income = expense.get("is_income", False)

    if not is_expense and not is_income:
        send_message(
            phone,
            "🤔 No detecté una transacción en ese mensaje.\n\n"
            "Ejemplos de gastos:\n"
            '• "gasté 1500 en pizza"\n'
            '• "taxi 800"\n\n'
            "Ejemplos de ingresos:\n"
            '• "cobré 200000 de sueldo"\n'
            '• "me pagaron 50 dólares"\n\n'
            "Para ver comandos disponibles enviá /ayuda",
        )
        return

    set_session(phone, {"state": "confirming", "pending_expense": expense})

    cat_info = get_category(expense.get("category", "otros"))
    amount = expense.get("amount", 0)
    currency = expense.get("currency", "ARS")
    desc = expense.get("description", "")
    exp_date = expense.get("date", "")
    tx_label = "ingreso" if is_income else "gasto"
    icon = "💰" if is_income else "💸"

    confirm_text = (
        f"✅ *¿Registro este {tx_label}?*\n\n"
        f"{icon} Monto: ${amount:,.2f} {currency}\n"
        f"{cat_info['emoji']} Categoría: {cat_info['label']}\n"
        f"📝 Descripción: {desc}\n"
        f"📅 Fecha: {exp_date}\n\n"
        f"Respondé *Sí* para guardar o *No* para cancelar.\n"
        f"Si hay un error, reescribí y lo re-proceso."
    )

    send_button_message(phone, confirm_text, ["Sí", "No"])


# Expuesto para que audio_handler lo pueda llamar directamente
process_expense_text = _process_expense_text


def _handle_confirmation(phone: str, text: str, session: dict) -> None:
    lower = text.lower()

    if any(lower == w or lower.startswith(w + " ") for w in _CONFIRM):
        expense = session["pending_expense"]
        saved = False

        # 1. Save to Supabase (primary — linked to web app)
        try:
            supabase_user = get_user_by_whatsapp(phone)
            if supabase_user:
                tx_type = "income" if expense.get("is_income") else "expense"
                result = save_transaction(
                    user_id=supabase_user["id"],
                    transaction_type=tx_type,
                    amount=expense.get("amount", 0),
                    currency=expense.get("currency", supabase_user.get("default_currency", "ARS")),
                    description=expense.get("description"),
                    category_name=expense.get("category"),
                    date=expense.get("date"),
                )
                if result:
                    saved = True
                    print(f"[supabase] Transaction saved for user {supabase_user['id']}")
        except Exception as e:
            print(f"[supabase] save_transaction error: {e}")

        # 2. Save to Google Sheets (fallback / backup)
        try:
            add_expense(expense)
            if not saved:
                saved = True
        except Exception as e:
            print(f"[sheets] add_expense error: {e}")
            if not saved:
                send_message(phone, "❌ No pude guardar. Verificá la configuración.")
                return

        clear_session(phone)
        cat_info = get_category(expense.get("category", "otros"))
        tx_type_label = "Ingreso" if expense.get("is_income") else "Gasto"
        send_message(
            phone,
            f"✅ *{tx_type_label} guardado*\n\n"
            f"{cat_info['emoji']} {expense.get('description')}\n"
            f"💰 ${expense.get('amount', 0):,.2f} {expense.get('currency', 'ARS')}\n"
            f"📅 {expense.get('date')}",
        )

    elif any(lower == w for w in _CANCEL):
        clear_session(phone)
        send_message(phone, "❌ Gasto cancelado. Podés registrar uno nuevo cuando quieras.")

    else:
        # Tratar como corrección: re-parsear
        clear_session(phone)
        _process_expense_text(phone, text)
