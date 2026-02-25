'use strict';

const { google } = require('googleapis');
const path = require('path');
const config = require('../config');

let sheetsClient = null;

const HEADERS = ['Fecha', 'Monto', 'Moneda', 'Categoría', 'Descripción', 'Registrado en'];

/** Retorna (y cachea) el cliente autenticado de Google Sheets. */
async function getClient() {
  if (sheetsClient) return sheetsClient;

  let credentials;
  if (config.google.credentialsJson) {
    // Variable de entorno con JSON inline (Railway, Render, Heroku, etc.)
    credentials = JSON.parse(config.google.credentialsJson);
  } else {
    credentials = require(path.resolve(config.google.credentialsPath));
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const authClient = await auth.getClient();
  sheetsClient = google.sheets({ version: 'v4', auth: authClient });
  return sheetsClient;
}

/** Asegura que la fila de encabezados exista en la hoja. */
async function ensureHeaders() {
  const sheets = await getClient();
  const { spreadsheetId, sheetName } = config.google;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:F1`,
  });

  const existingHeaders = res.data.values?.[0];
  if (!existingHeaders || existingHeaders[0] !== HEADERS[0]) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1:F1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [HEADERS] },
    });
  }
}

/**
 * Agrega una fila de gasto a la hoja.
 * @param {{ amount:number, currency:string, category:string, description:string, date:string }} expense
 */
async function addExpense(expense) {
  await ensureHeaders();

  const sheets = await getClient();
  const { spreadsheetId, sheetName } = config.google;

  const row = [
    expense.date,
    expense.amount,
    expense.currency,
    expense.category,
    expense.description,
    new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }),
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:F`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

/**
 * Retorna los últimos N gastos de la hoja (más reciente primero).
 * @param {number} limit
 * @returns {Promise<string[][]>}
 */
async function getRecentExpenses(limit = 5) {
  const sheets = await getClient();
  const { spreadsheetId, sheetName } = config.google;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:F`,
  });

  const rows = (res.data.values || []).slice(1); // Sin headers
  return rows.slice(-limit).reverse();
}

/**
 * Calcula el resumen del mes actual agrupado por moneda y categoría.
 * @returns {Promise<{summary: Object, count: number}>}
 */
async function getMonthlySummary() {
  const sheets = await getClient();
  const { spreadsheetId, sheetName } = config.google;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:F`,
  });

  const rows = (res.data.values || []).slice(1);

  const now = new Date();
  const currentPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const monthRows = rows.filter(r => r[0] && r[0].startsWith(currentPrefix));

  /** @type {Record<string, {total:number, categories:Record<string,number>}>} */
  const summary = {};

  for (const row of monthRows) {
    const amount = parseFloat(row[1]) || 0;
    const currency = row[2] || config.defaultCurrency;
    const category = row[3] || 'otros';

    if (!summary[currency]) summary[currency] = { total: 0, categories: {} };
    summary[currency].total += amount;
    summary[currency].categories[category] = (summary[currency].categories[category] || 0) + amount;
  }

  return { summary, count: monthRows.length };
}

module.exports = { addExpense, getRecentExpenses, getMonthlySummary };
