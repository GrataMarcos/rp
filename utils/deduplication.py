"""
Deduplicación de mensajes via DynamoDB (misma tabla que sesiones).
Evita que Meta reenvíe el mismo webhook y se procese dos veces.
TTL de 5 minutos para los registros de dedup.
"""

import os
import time

import boto3

_TABLE_NAME = os.environ.get("DYNAMODB_TABLE", "ExpenseBotData")
_DEDUP_TTL = 300  # 5 minutos

_dynamodb = boto3.resource("dynamodb")
_table = _dynamodb.Table(_TABLE_NAME)


def is_duplicate(message_id: str) -> bool:
    """
    Retorna True si el mensaje ya fue procesado.
    Si es nuevo, lo registra y retorna False.
    """
    pk = f"dedup#{message_id}"
    try:
        # conditional_expression asegura atomicidad: solo inserta si no existe
        _table.put_item(
            Item={"pk": pk, "ttl": int(time.time()) + _DEDUP_TTL},
            ConditionExpression="attribute_not_exists(pk)",
        )
        return False  # Es nuevo
    except _dynamodb.meta.client.exceptions.ConditionalCheckFailedException:
        return True  # Ya existía → duplicado
    except Exception as e:
        print(f"[dedup] error: {e}")
        return False  # En caso de error, procesamos igual
