import json
import os
import tempfile
from datetime import date

from openai import OpenAI

_client = OpenAI(api_key=os.environ["OPENAI_API_KEY"])
_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

_DEFAULT_CURRENCY = os.environ.get("DEFAULT_CURRENCY", "ARS")

_SYSTEM_PROMPT = f"""Eres un asistente para registrar finanzas personales (ingresos y gastos).
Extraé información del mensaje del usuario y respondé SOLO con JSON válido.

JSON cuando SÍ es un GASTO:
{{
  "is_expense": true,
  "is_income": false,
  "amount": <número positivo>,
  "currency": "<ARS|USD|EUR>",
  "category": "<comida|supermercado|transporte|hogar|salud|entretenimiento|ropa|educacion|servicios|trabajo|viajes|otros>",
  "description": "<descripción breve, máx 60 chars>",
  "date": "<YYYY-MM-DD>"
}}

JSON cuando SÍ es un INGRESO:
{{
  "is_expense": false,
  "is_income": true,
  "amount": <número positivo>,
  "currency": "<ARS|USD|EUR>",
  "category": "<sueldo|freelance|inversiones|otros ingresos>",
  "description": "<descripción breve, máx 60 chars>",
  "date": "<YYYY-MM-DD>"
}}

JSON cuando NO es ninguno de los dos:
{{ "is_expense": false, "is_income": false }}

Reglas:
- Moneda por defecto: {_DEFAULT_CURRENCY}.
- Si no se menciona fecha, usá el día de hoy: {{TODAY}}.
- Gastos: "gasté", "pagué", "compré", "taxi", "uber", "mercado", "factura", etc.
- Ingresos: "cobré", "ingresé", "me pagaron", "recibí", "sueldo", "facturé", etc.
- Abreviaturas: "1k" = 1000, "1.5k" = 1500.
- Si hay múltiples transacciones, tomá la principal."""

# MIME type → extensión compatible con Whisper
_MIME_EXT = {
    "audio/ogg": ".ogg",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/wav": ".wav",
    "audio/webm": ".webm",
    "audio/aac": ".aac",
}


def parse_expense(text: str) -> dict:
    """Parsea texto libre y retorna un dict con los datos del gasto."""
    today = date.today().isoformat()
    prompt = _SYSTEM_PROMPT.replace("{TODAY}", today)

    response = _client.chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": prompt},
            {"role": "user", "content": text},
        ],
        response_format={"type": "json_object"},
        max_tokens=200,
        temperature=0.1,
    )
    return json.loads(response.choices[0].message.content)


def transcribe_audio(audio_bytes: bytes, mime_type: str) -> str:
    """Transcribe audio usando Whisper. Escribe a /tmp (Lambda-compatible)."""
    ext = _MIME_EXT.get(mime_type, ".ogg")

    with tempfile.NamedTemporaryFile(suffix=ext, dir="/tmp", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            transcript = _client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                language="es",
            )
        return transcript.text.strip()
    finally:
        os.unlink(tmp_path)
