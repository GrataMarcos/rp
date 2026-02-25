"""
Expense Bot — AWS Lambda entry point
Maneja el webhook de Meta WhatsApp Cloud API.

Métodos soportados:
  GET  /webhook → verificación del webhook por Meta
  POST /webhook → mensajes entrantes
"""

import json
import os

from handlers.message_handler import handle_message

_VERIFY_TOKEN = os.environ["WHATSAPP_VERIFY_TOKEN"]


def lambda_handler(event: dict, context) -> dict:
    method = event.get("httpMethod", "POST")

    if method == "GET":
        return _verify_webhook(event)

    if method == "POST":
        return _process_webhook(event)

    return _response(405, "Method Not Allowed")


# ──────────────────────────────────────────────────────────────
# Verificación del webhook (Meta llama a esto una sola vez al configurar)
# ──────────────────────────────────────────────────────────────

def _verify_webhook(event: dict) -> dict:
    params = event.get("queryStringParameters") or {}
    mode      = params.get("hub.mode")
    token     = params.get("hub.verify_token")
    challenge = params.get("hub.challenge", "")

    if mode == "subscribe" and token == _VERIFY_TOKEN:
        print("✅ Webhook verificado por Meta")
        return _response(200, challenge)

    print("⚠️  Verificación fallida — token incorrecto")
    return _response(403, "Forbidden")


# ──────────────────────────────────────────────────────────────
# Procesamiento de mensajes entrantes
# ──────────────────────────────────────────────────────────────

def _process_webhook(event: dict) -> dict:
    # Respondemos 200 primero — Meta espera hasta 20s pero es buena práctica
    # En Lambda sincrónico respondemos al final, igual dentro del timeout.
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError:
        return _response(400, "Bad Request")

    if body.get("object") != "whatsapp_business_account":
        return _response(200, "OK")

    messages = (
        (body.get("entry") or [{}])[0]
        .get("changes", [{}])[0]
        .get("value", {})
        .get("messages")
    )

    if messages:
        # Procesamos el primer mensaje del batch (Meta envía de a 1 en general)
        handle_message(messages[0])

    return _response(200, "OK")


def _response(status: int, body: str) -> dict:
    return {
        "statusCode": status,
        "headers": {"Content-Type": "text/plain"},
        "body": body,
    }
