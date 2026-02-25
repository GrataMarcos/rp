# 💸 Expense Bot — WhatsApp + Google Sheets + AWS Lambda

Bot de WhatsApp que registra gastos en Google Sheets usando inteligencia artificial. Soporta mensajes de texto y notas de voz. Corre serverless en AWS Lambda.

## Funcionalidades

| Feature | Detalle |
|---|---|
| 📝 Texto | "gasté 1500 en pizza" → parsea monto, categoría y fecha |
| 🎤 Audio | Notas de voz → Whisper transcribe → mismo flujo que texto |
| ✅ Confirmación | Muestra el gasto parseado antes de guardar |
| 📊 Resumen | `/resumen` → totales del mes por categoría y moneda |
| 📋 Recientes | `/recientes` → últimos 5 gastos |
| 🏷️ Categorías | Detección automática: comida, transporte, hogar, salud... |
| 💱 Multi-moneda | ARS, USD, EUR (detección automática) |
| 🔁 Corrección | Si la IA se equivoca, reescribís el gasto para re-parsear |

---

## Arquitectura

```
WhatsApp ──► API Gateway ──► Lambda (lambda_function.py)
                                    │
                     ┌──────────────┼──────────────┐
                     ▼              ▼               ▼
                  OpenAI        DynamoDB       Google Sheets
              (GPT + Whisper)  (sesiones)      (registro)
```

**Estructura modular** — Lambda corre todo desde el `.zip` de deploy:
```
lambda_function.py      ← Entry point
handlers/
  message_handler.py   ← Router de mensajes
  text_handler.py      ← Texto → parse → confirmación → Sheets
  audio_handler.py     ← Audio → Whisper → text_handler
  command_handler.py   ← /resumen /recientes /categorias /ayuda /cancelar
services/
  whatsapp.py          ← Meta Cloud API
  openai_service.py    ← GPT-4o-mini + Whisper
  sheets.py            ← Google Sheets API
utils/
  session.py           ← Estado de conversación (DynamoDB)
  deduplication.py     ← Evitar doble procesamiento (DynamoDB)
  categories.py        ← 12 categorías con emojis
```

---

## Setup paso a paso

### 1. Clonar e instalar localmente

```bash
git clone <repo>
cd expense-bot-whatsapp
pip install -r requirements.txt
```

### 2. DynamoDB — Crear la tabla

En AWS Console → DynamoDB → Create table:
- **Table name**: `ExpenseBotData`
- **Partition key**: `pk` (String)
- Dejar todo lo demás por defecto

Luego en la tabla creada:
- Additional settings → Time to Live (TTL) → Enable → atributo: `ttl`

> La tabla se usa para sesiones de conversación (30 min TTL) y deduplicación de mensajes (5 min TTL).

### 3. IAM — Permisos de Lambda

La función Lambda necesita permisos sobre DynamoDB. En el rol de ejecución de Lambda, agregar la policy:

```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:GetItem",
    "dynamodb:PutItem",
    "dynamodb:DeleteItem"
  ],
  "Resource": "arn:aws:dynamodb:<region>:<account>:table/ExpenseBotData"
}
```

### 4. Google Sheets — Service Account

1. [console.cloud.google.com](https://console.cloud.google.com) → Crear proyecto
2. Habilitar **Google Sheets API**
3. IAM & Admin → Service Accounts → Crear → Descargar clave JSON
4. Crear un Google Spreadsheet con una hoja llamada `Gastos`
5. Compartir el spreadsheet con el email de la service account (permiso Editor)
6. Copiar el ID del spreadsheet desde la URL → `GOOGLE_SPREADSHEET_ID`
7. Pegar el contenido del JSON como valor de `GOOGLE_CREDENTIALS_JSON` en Lambda

### 5. Variables de entorno en Lambda

En AWS Console → Lambda → Tu función → Configuration → Environment variables:

| Variable | Valor |
|---|---|
| `WHATSAPP_TOKEN` | Token de Meta (EAABs...) |
| `WHATSAPP_PHONE_NUMBER_ID` | ID del número |
| `WHATSAPP_VERIFY_TOKEN` | String secreto (elegís vos) |
| `OPENAI_API_KEY` | sk-proj-... |
| `GOOGLE_SPREADSHEET_ID` | ID del spreadsheet |
| `GOOGLE_CREDENTIALS_JSON` | Contenido completo del credentials.json |
| `DYNAMODB_TABLE` | `ExpenseBotData` |
| `DEFAULT_CURRENCY` | `ARS` |

### 6. Deploy

```bash
# Generar el zip
chmod +x build.sh
./build.sh

# Subir a Lambda
aws lambda update-function-code \
  --function-name <nombre-de-tu-funcion> \
  --zip-file fileb://lambda.zip
```

O desde la consola de AWS: Lambda → Upload from → .zip file

**Configuración recomendada de la función Lambda:**
- Runtime: Python 3.12
- Handler: `lambda_function.lambda_handler`
- Timeout: 30 segundos (Whisper + Sheets pueden tardar hasta ~10s)
- Memory: 256 MB

### 7. Configurar el webhook en Meta

En Meta Developers → Tu app → WhatsApp → Configuration:
- **Callback URL**: `https://<tu-api-gateway-url>/webhook`
- **Verify Token**: el valor de `WHATSAPP_VERIFY_TOKEN`
- Suscribirse al campo: `messages`

---

## Uso

### Registrar un gasto

Enviá un mensaje de texto o nota de voz:

```
gasté 1500 en pizza
taxi 800 pesos
Netflix 15 dólares
supermercado 12400
almuerzo con cliente 3500
```

El bot parsea el gasto y pide confirmación. Respondé **Sí** para guardar o **No** para cancelar. Si los datos son incorrectos, reescribí el gasto.

### Comandos

| Comando | Descripción |
|---|---|
| `/ayuda` | Muestra la ayuda |
| `/resumen` | Resumen del mes por categoría y moneda |
| `/recientes` | Últimos 5 gastos |
| `/categorias` | Lista de categorías disponibles |
| `/cancelar` | Cancela la operación en curso |

---

## Estructura del Google Spreadsheet

La hoja `Gastos` se crea automáticamente con estos headers:

| Fecha | Monto | Moneda | Categoría | Descripción | Registrado en |
|---|---|---|---|---|---|
| 2024-08-15 | 1500 | ARS | comida | Pizza | 15/08/2024 20:30:00 |
| 2024-08-15 | 800 | ARS | transporte | Taxi | 15/08/2024 20:45:00 |
