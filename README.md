# 💸 Expense Bot — WhatsApp + Google Sheets

Bot de WhatsApp que registra gastos en Google Sheets usando inteligencia artificial. Soporta mensajes de texto y notas de voz.

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

## Requisitos previos

- Node.js 18+
- Cuenta Meta Business con WhatsApp Business API configurada
- API Key de OpenAI
- Cuenta de Google Cloud con Sheets API habilitada

---

## Setup paso a paso

### 1. Clonar e instalar

```bash
git clone <repo>
cd expense-bot-whatsapp
npm install
cp .env.example .env
```

### 2. Meta WhatsApp Business API

1. Ir a [developers.facebook.com](https://developers.facebook.com) → Tu app → WhatsApp → API Setup
2. Copiar el **Phone Number ID** → `WHATSAPP_PHONE_NUMBER_ID`
3. Generar un **Token permanente** → `WHATSAPP_TOKEN`
4. Elegir cualquier string como **Verify Token** → `WHATSAPP_VERIFY_TOKEN`
5. Configurar el webhook (ver paso 5)

### 3. OpenAI

1. Ir a [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Crear una API Key → `OPENAI_API_KEY`

### 4. Google Sheets + Service Account

1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Crear proyecto → habilitar **Google Sheets API**
3. IAM & Admin → Service Accounts → Crear cuenta de servicio
4. Crear clave JSON → descargar como `credentials.json` en la raíz del proyecto
5. Crear un Google Spreadsheet con una hoja llamada `Gastos`
6. Compartir el spreadsheet con el email de la cuenta de servicio (con permiso de Editor)
7. Copiar el ID del spreadsheet desde la URL → `GOOGLE_SPREADSHEET_ID`

### 5. Exponer el servidor (desarrollo local)

Usá [ngrok](https://ngrok.com) para exponer el puerto local:

```bash
ngrok http 3000
```

Copiá la URL HTTPS que genera (ej. `https://abc123.ngrok.io`).

En Meta Developers → WhatsApp → Configuration:
- **Webhook URL**: `https://abc123.ngrok.io/webhook`
- **Verify Token**: el valor de `WHATSAPP_VERIFY_TOKEN`
- Suscribirse a: `messages`

### 6. Correr el bot

```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

---

## Deploy en producción

### Railway / Render / Fly.io

1. Subir el código al repo
2. Configurar las variables de entorno en el dashboard
3. Para `GOOGLE_CREDENTIALS_JSON`: pegar el contenido del JSON como string en una variable (no subir el archivo)
4. La URL del deploy va como Webhook URL en Meta

### Heroku

```bash
heroku create
heroku config:set WHATSAPP_TOKEN=... OPENAI_API_KEY=... # etc
git push heroku main
```

---

## Uso

### Registrar un gasto

Simplemente enviá un mensaje describiendo el gasto:

```
gasté 1500 en pizza
taxi 800 pesos
Netflix 15 dólares
supermercado 12400
almuerzo con cliente 3500
```

El bot va a responder con los datos parseados y pedirte confirmación.
Respondé **Sí** para guardar o **No** para cancelar.
Si los datos son incorrectos, reescribí el gasto y el bot lo re-parsea.

### Notas de voz

Grabá una nota de voz describiendo el gasto. El bot la transcribe con Whisper y sigue el mismo flujo.

### Comandos

| Comando | Descripción |
|---|---|
| `/ayuda` | Muestra la ayuda |
| `/resumen` | Resumen del mes actual por categoría |
| `/recientes` | Últimos 5 gastos |
| `/categorias` | Lista de categorías disponibles |
| `/cancelar` | Cancela la operación en curso |

---

## Estructura del proyecto

```
src/
├── index.js                 # Servidor Express
├── config/
│   └── index.js             # Variables de entorno
├── routes/
│   └── webhook.js           # Webhook de Meta
├── handlers/
│   ├── messageHandler.js    # Enrutador de mensajes
│   ├── textHandler.js       # Flujo de texto + confirmación
│   ├── audioHandler.js      # Descarga + transcripción de audio
│   └── commandHandler.js    # Comandos /slash
├── services/
│   ├── whatsapp.js          # API de Meta WhatsApp
│   ├── openai.js            # GPT-4o-mini + Whisper
│   └── sheets.js            # Google Sheets API
└── utils/
    ├── categories.js        # Definición de categorías
    ├── session.js           # Estado de conversación (en memoria)
    └── deduplication.js     # Prevención de mensajes duplicados
```

## Estructura del Google Spreadsheet

| Fecha | Monto | Moneda | Categoría | Descripción | Registrado en |
|---|---|---|---|---|---|
| 2024-08-15 | 1500 | ARS | comida | Pizza | 15/8/2024 20:30:00 |
| 2024-08-15 | 800 | ARS | transporte | Taxi | 15/8/2024 20:45:00 |
