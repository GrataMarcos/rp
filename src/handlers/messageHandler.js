'use strict';

const { sendMessage, markAsRead } = require('../services/whatsapp');
const { isDuplicate } = require('../utils/deduplication');
const { handleText } = require('./textHandler');
const { handleAudio } = require('./audioHandler');
const { handleCommand } = require('./commandHandler');

/**
 * Punto de entrada para todos los mensajes de WhatsApp entrantes.
 * Decide qué handler invocar según el tipo de mensaje.
 *
 * @param {Object} message Objeto message del webhook de Meta
 */
async function handleMessage(message) {
  // Deduplicación: Meta puede reenviar el mismo webhook
  if (isDuplicate(message.id)) {
    console.log(`[dedup] Mensaje duplicado ignorado: ${message.id}`);
    return;
  }

  const from = message.from;
  const type = message.type;

  // Marcar como leído (doble check azul)
  await markAsRead(message.id);

  console.log(`[msg] from=${from} type=${type} id=${message.id}`);

  try {
    switch (type) {
      case 'text': {
        const text = message.text?.body?.trim() || '';
        if (!text) return;

        if (text.startsWith('/')) {
          await handleCommand(from, text);
        } else {
          await handleText(from, text);
        }
        break;
      }

      case 'audio': {
        await handleAudio(from, message.audio);
        break;
      }

      case 'interactive': {
        // Respuesta a botones de confirmación
        const reply =
          message.interactive?.button_reply?.title ||
          message.interactive?.list_reply?.title;
        if (reply) await handleText(from, reply);
        break;
      }

      default:
        await sendMessage(
          from,
          '📱 Solo proceso mensajes de texto y notas de voz.\nEnviá /ayuda para ver qué puedo hacer.'
        );
    }
  } catch (err) {
    console.error(`[handler] Error inesperado para ${from}:`, err);
    await sendMessage(from, '❌ Ocurrió un error inesperado. Intentá de nuevo.');
  }
}

module.exports = { handleMessage };
