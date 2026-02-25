'use strict';

const axios = require('axios');
const config = require('../config');

const BASE_URL = `https://graph.facebook.com/${config.whatsapp.version}`;

/** Headers comunes para todas las llamadas a la API de Meta */
function authHeaders() {
  return {
    Authorization: `Bearer ${config.whatsapp.token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Envía un mensaje de texto simple.
 * @param {string} to  Número en formato E.164 (ej. 5491112345678)
 * @param {string} text
 */
async function sendMessage(to, text) {
  await axios.post(
    `${BASE_URL}/${config.whatsapp.phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    },
    { headers: authHeaders() }
  );
}

/**
 * Envía un mensaje con botones de respuesta rápida (máx 3 botones).
 * Fallback a texto si la plataforma no soporta interactivos.
 * @param {string} to
 * @param {string} bodyText   Cuerpo del mensaje
 * @param {string[]} buttons  Etiquetas de los botones (máx 20 chars c/u)
 */
async function sendButtonMessage(to, bodyText, buttons) {
  try {
    await axios.post(
      `${BASE_URL}/${config.whatsapp.phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: bodyText },
          action: {
            buttons: buttons.slice(0, 3).map((label, i) => ({
              type: 'reply',
              reply: { id: `btn_${i}_${Date.now()}`, title: label.slice(0, 20) },
            })),
          },
        },
      },
      { headers: authHeaders() }
    );
  } catch {
    // Fallback a texto plano si los botones no están disponibles
    await sendMessage(to, `${bodyText}\n\nOpciones: ${buttons.join(' / ')}`);
  }
}

/**
 * Obtiene la URL de descarga de un media enviado por el usuario.
 * @param {string} mediaId
 * @returns {Promise<string>} URL temporal de descarga
 */
async function getMediaUrl(mediaId) {
  const response = await axios.get(`${BASE_URL}/${mediaId}`, {
    headers: authHeaders(),
  });
  return response.data.url;
}

/**
 * Descarga un media y lo retorna como Buffer.
 * @param {string} mediaUrl
 * @returns {Promise<Buffer>}
 */
async function downloadMedia(mediaUrl) {
  const response = await axios.get(mediaUrl, {
    headers: { Authorization: `Bearer ${config.whatsapp.token}` },
    responseType: 'arraybuffer',
  });
  return Buffer.from(response.data);
}

/**
 * Marca un mensaje como "leído" (✓✓ azul).
 * @param {string} messageId
 */
async function markAsRead(messageId) {
  await axios.post(
    `${BASE_URL}/${config.whatsapp.phoneNumberId}/messages`,
    {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    },
    { headers: authHeaders() }
  ).catch(() => {}); // No crítico
}

module.exports = { sendMessage, sendButtonMessage, getMediaUrl, downloadMedia, markAsRead };
