from services.whatsapp import send_message, get_media_url, download_media
from services.openai_service import transcribe_audio
from handlers.text_handler import process_expense_text


def handle_audio(phone: str, audio_msg: dict) -> None:
    """
    Descarga la nota de voz, la transcribe con Whisper y procesa el texto como gasto.
    audio_msg: dict con 'id' y 'mime_type' del mensaje de WhatsApp.
    """
    send_message(phone, "🎤 Escuchando tu nota de voz...")

    try:
        media_url = get_media_url(audio_msg["id"])
        audio_bytes = download_media(media_url)
    except Exception as e:
        print(f"[whatsapp] download_media error: {e}")
        send_message(
            phone,
            "❌ No pude descargar el audio. Intentá de nuevo o enviá un mensaje de texto.",
        )
        return

    try:
        transcript = transcribe_audio(audio_bytes, audio_msg.get("mime_type", "audio/ogg"))
    except Exception as e:
        print(f"[openai] transcribe_audio error: {e}")
        send_message(phone, "❌ No pude transcribir el audio. Intentá con un mensaje de texto.")
        return

    if not transcript:
        send_message(phone, "❌ No entendí el audio. Intentá con un mensaje de texto.")
        return

    send_message(phone, f'🎤 *Escuché:* "{transcript}"')
    process_expense_text(phone, transcript)
