'use strict';

module.exports = {
  port: process.env.PORT || 3000,

  whatsapp: {
    token: process.env.WHATSAPP_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,
    version: 'v20.0',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  },

  google: {
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID,
    sheetName: process.env.GOOGLE_SHEET_NAME || 'Gastos',
    // Soporta ruta de archivo local O JSON inline (para deploys en Railway/Render/Heroku)
    credentialsPath: process.env.GOOGLE_CREDENTIALS_PATH || './credentials.json',
    credentialsJson: process.env.GOOGLE_CREDENTIALS_JSON || null,
  },

  defaultCurrency: process.env.DEFAULT_CURRENCY || 'ARS',
  // Sesiones expiran a los 30 minutos de inactividad
  sessionTtlSeconds: parseInt(process.env.SESSION_TTL_SECONDS || '1800', 10),
};
