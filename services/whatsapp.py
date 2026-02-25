import os
import requests

_BASE = f"https://graph.facebook.com/{os.environ.get('WHATSAPP_API_VERSION', 'v20.0')}"
_PHONE_ID = os.environ["WHATSAPP_PHONE_NUMBER_ID"]
_TOKEN = os.environ["WHATSAPP_TOKEN"]
_HEADERS = {"Authorization": f"Bearer {_TOKEN}", "Content-Type": "application/json"}


def send_message(to: str, text: str) -> None:
    requests.post(
        f"{_BASE}/{_PHONE_ID}/messages",
        json={
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": text},
        },
        headers=_HEADERS,
        timeout=10,
    ).raise_for_status()


def send_button_message(to: str, body_text: str, buttons: list[str]) -> None:
    """Envía mensaje con hasta 3 botones de respuesta rápida.
    Hace fallback a texto plano si la API rechaza el interactivo.
    """
    try:
        requests.post(
            f"{_BASE}/{_PHONE_ID}/messages",
            json={
                "messaging_product": "whatsapp",
                "to": to,
                "type": "interactive",
                "interactive": {
                    "type": "button",
                    "body": {"text": body_text},
                    "action": {
                        "buttons": [
                            {"type": "reply", "reply": {"id": f"btn_{i}", "title": label[:20]}}
                            for i, label in enumerate(buttons[:3])
                        ]
                    },
                },
            },
            headers=_HEADERS,
            timeout=10,
        ).raise_for_status()
    except Exception:
        # Fallback: texto plano con opciones
        send_message(to, f"{body_text}\n\nOpciones: {' / '.join(buttons)}")


def get_media_url(media_id: str) -> str:
    resp = requests.get(
        f"{_BASE}/{media_id}",
        headers={"Authorization": f"Bearer {_TOKEN}"},
        timeout=10,
    )
    resp.raise_for_status()
    return resp.json()["url"]


def download_media(media_url: str) -> bytes:
    resp = requests.get(
        media_url,
        headers={"Authorization": f"Bearer {_TOKEN}"},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.content


def mark_as_read(message_id: str) -> None:
    """Marca el mensaje como leído (doble check azul). No crítico."""
    try:
        requests.post(
            f"{_BASE}/{_PHONE_ID}/messages",
            json={
                "messaging_product": "whatsapp",
                "status": "read",
                "message_id": message_id,
            },
            headers=_HEADERS,
            timeout=5,
        )
    except Exception:
        pass
