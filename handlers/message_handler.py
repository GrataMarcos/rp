from services.whatsapp import send_message, mark_as_read
from services.supabase_service import delete_transaction
from utils.deduplication import is_duplicate
from utils.session import get_session, clear_session
from handlers.text_handler import handle_text
from handlers.audio_handler import handle_audio
from handlers.command_handler import handle_command


def handle_message(message: dict) -> None:
    """
    Router principal para todos los mensajes entrantes de WhatsApp.
    message: objeto 'message' del webhook de Meta.
    """
    msg_id = message.get("id", "")
    phone = message.get("from", "")
    msg_type = message.get("type", "")

    # Evitar doble procesamiento por reintentos de Meta
    if is_duplicate(msg_id):
        print(f"[dedup] Mensaje duplicado ignorado: {msg_id}")
        return

    # Doble check azul
    mark_as_read(msg_id)

    print(f"[msg] from={phone} type={msg_type} id={msg_id}")

    try:
        match msg_type:
            case "text":
                text = (message.get("text") or {}).get("body", "").strip()
                if not text:
                    return
                if text.startswith("/"):
                    handle_command(phone, text)
                else:
                    handle_text(phone, text)

            case "audio":
                handle_audio(phone, message["audio"])

            case "interactive":
                # Respuesta a botones (Sí/No, selección de grupo, etc.)
                reply = (
                    (message.get("interactive") or {})
                    .get("button_reply", {})
                    .get("title", "")
                )
                if reply:
                    # Special case: delete confirmation
                    session = get_session(phone)
                    if (
                        session.get("state") == "confirming"
                        and isinstance(session.get("pending_expense"), dict)
                        and session["pending_expense"].get("_action") == "delete"
                    ):
                        if reply.lower() in {"sí, eliminar", "si, eliminar", "sí", "si"}:
                            pending = session["pending_expense"]
                            ok = delete_transaction(pending["_tx_id"], pending["_user_id"])
                            clear_session(phone)
                            send_message(phone, "✅ Transacción eliminada." if ok else "❌ No se pudo eliminar.")
                        else:
                            clear_session(phone)
                            send_message(phone, "❌ Eliminación cancelada.")
                    else:
                        handle_text(phone, reply)

            case _:
                send_message(
                    phone,
                    "📱 Solo proceso mensajes de texto y notas de voz.\n"
                    "Enviá /ayuda para ver qué puedo hacer.",
                )

    except Exception as e:
        print(f"[handler] Error inesperado para {phone}: {e}")
        send_message(phone, "❌ Ocurrió un error inesperado. Intentá de nuevo.")
