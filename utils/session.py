"""
Sesiones de conversación respaldadas por DynamoDB.

Tabla requerida:
  Nombre : ExpenseBotData  (configurable via env DYNAMODB_TABLE)
  PK     : pk  (String)
  TTL    : ttl (Number)  — habilitar en DynamoDB → Table → Additional settings
"""

import json
import os
import time
from typing import Any, Optional

import boto3
from boto3.dynamodb.conditions import Key

_TABLE_NAME = os.environ.get("DYNAMODB_TABLE", "ExpenseBotData")
_SESSION_TTL = int(os.environ.get("SESSION_TTL_SECONDS", "1800"))  # 30 min

_dynamodb = boto3.resource("dynamodb")
_table = _dynamodb.Table(_TABLE_NAME)


def _session_pk(phone: str) -> str:
    return f"session#{phone}"


def get_session(phone: str) -> dict:
    try:
        resp = _table.get_item(Key={"pk": _session_pk(phone)})
        item = resp.get("Item")
        if not item:
            return {"state": "idle", "pending_expense": None}
        return {
            "state": item.get("state", "idle"),
            "pending_expense": json.loads(item["pending_expense"])
            if item.get("pending_expense")
            else None,
        }
    except Exception as e:
        print(f"[session] get_session error: {e}")
        return {"state": "idle", "pending_expense": None}


def set_session(phone: str, session: dict) -> None:
    try:
        _table.put_item(
            Item={
                "pk": _session_pk(phone),
                "state": session["state"],
                "pending_expense": json.dumps(session.get("pending_expense")),
                "ttl": int(time.time()) + _SESSION_TTL,
            }
        )
    except Exception as e:
        print(f"[session] set_session error: {e}")


def clear_session(phone: str) -> None:
    try:
        _table.delete_item(Key={"pk": _session_pk(phone)})
    except Exception as e:
        print(f"[session] clear_session error: {e}")
