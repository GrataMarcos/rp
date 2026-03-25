from services.whatsapp import send_message, send_button_message
from services.openai_service import parse_expense
from services.supabase_service import (
    get_user_by_whatsapp,
    save_transaction_to_group,
    get_user_groups,
    get_individual_group_id,
)
from utils.session import get_session, set_session, clear_session
from utils.categories import get_category

_CONFIRM = {"sí", "si", "yes", "ok", "dale", "confirmar", "confirmo", "listo", "👍", "correcto"}
_CANCEL  = {"no", "nope", "cancelar", "cancel", "salir", "👎"}


def handle_text(phone: str, text: str) -> None:
    session = get_session(phone)

    if session["state"] == "confirming" and session.get("pending_expense"):
        _handle_confirmation(phone, text.strip(), session)
    elif session["state"] == "selecting_group" and session.get("pending_expense"):
        _handle_group_selection(phone, text.strip(), session)
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

    # Check if user has multiple non-individual groups → ask which group
    try:
        supabase_user = get_user_by_whatsapp(phone)
        if supabase_user:
            groups = get_user_groups(supabase_user["id"])
            non_individual = [g for g in groups if not g["is_individual"]]

            if len(non_individual) >= 1:
                # Save expense and groups to session, ask user to select
                set_session(phone, {
                    "state": "selecting_group",
                    "pending_expense": {**expense, "_user_id": supabase_user["id"], "_groups": groups},
                })

                # Build button list (max 3 for WhatsApp buttons)
                group_options = [{"id": g["id"], "label": g["name"]} for g in groups]
                # Limit to 3 buttons (WhatsApp limit), prefer personal + up to 2 groups
                individual = next((g for g in groups if g["is_individual"]), None)
                if individual:
                    non_individual_limited = non_individual[:2]
                    button_groups = [individual] + non_individual_limited
                else:
                    button_groups = groups[:3]

                buttons = [g["name"] for g in button_groups]
                send_button_message(
                    phone,
                    "📂 *¿A qué grupo registramos este movimiento?*",
                    buttons,
                )
                # Store group mapping in session
                set_session(phone, {
                    "state": "selecting_group",
                    "pending_expense": {
                        **expense,
                        "_user_id": supabase_user["id"],
                        "_group_map": {g["name"]: g["id"] for g in button_groups},
                    },
                })
                return
    except Exception as e:
        print(f"[groups] Error fetching groups: {e}")

    # No multiple groups → proceed directly to confirmation
    _show_confirmation(phone, expense)


def _handle_group_selection(phone: str, text: str, session: dict) -> None:
    """Handle group selection button reply."""
    expense = session["pending_expense"]
    group_map = expense.get("_group_map", {})
    user_id = expense.get("_user_id")

    selected_group_id = group_map.get(text)
    if not selected_group_id and text.lower() not in _CANCEL:
        # Try partial match
        for name, gid in group_map.items():
            if text.lower() in name.lower():
                selected_group_id = gid
                break

    if text.lower() in _CANCEL or (not selected_group_id and len(group_map) > 0):
        clear_session(phone)
        send_message(phone, "❌ Operación cancelada.")
        return

    # Store selected group and move to confirmation
    clean_expense = {k: v for k, v in expense.items() if not k.startswith("_")}
    clean_expense["_user_id"] = user_id
    clean_expense["_group_id"] = selected_group_id

    set_session(phone, {"state": "confirming", "pending_expense": clean_expense})
    _show_confirmation(phone, clean_expense, group_name=text)


def _show_confirmation(phone: str, expense: dict, group_name: str = "") -> None:
    """Show confirmation message with Sí/No buttons."""
    set_session(phone, {"state": "confirming", "pending_expense": expense})

    cat_info = get_category(expense.get("category", "otros"))
    amount = expense.get("amount", 0)
    currency = expense.get("currency", "ARS")
    desc = expense.get("description", "")
    exp_date = expense.get("date", "")
    is_income = expense.get("is_income", False)
    tx_label = "ingreso" if is_income else "gasto"
    icon = "💰" if is_income else "💸"

    group_line = f"📂 Grupo: {group_name}\n" if group_name else ""

    confirm_text = (
        f"✅ *¿Registro este {tx_label}?*\n\n"
        f"{icon} Monto: ${amount:,.2f} {currency}\n"
        f"{cat_info['emoji']} Categoría: {cat_info['label']}\n"
        f"📝 Descripción: {desc}\n"
        f"📅 Fecha: {exp_date}\n"
        f"{group_line}\n"
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
        user_id = expense.get("_user_id")
        group_id = expense.get("_group_id")
        saved = False

        try:
            if not user_id:
                supabase_user = get_user_by_whatsapp(phone)
                if supabase_user:
                    user_id = supabase_user["id"]
                    if not group_id:
                        group_id = get_individual_group_id(user_id)

            if user_id:
                tx_type = "income" if expense.get("is_income") else "expense"
                result = save_transaction_to_group(
                    user_id=user_id,
                    group_id=group_id,
                    transaction_type=tx_type,
                    amount=expense.get("amount", 0),
                    currency=expense.get("currency", "ARS"),
                    description=expense.get("description"),
                    category_name=expense.get("category"),
                    date=expense.get("date"),
                )
                if result:
                    saved = True
                    print(f"[supabase] Transaction saved for user {user_id}, group {group_id}")
        except Exception as e:
            print(f"[supabase] save_transaction error: {e}")

        if not saved:
            send_message(phone, "❌ No pude guardar la transacción. Verificá la configuración.")
            clear_session(phone)
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
        send_message(phone, "❌ Operación cancelada. Podés registrar una nueva cuando quieras.")

    else:
        # Re-parse as correction
        clear_session(phone)
        _process_expense_text(phone, text)
