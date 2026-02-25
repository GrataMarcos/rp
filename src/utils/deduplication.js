'use strict';

const NodeCache = require('node-cache');

// Mensajes procesados en los últimos 5 minutos
const processed = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Retorna true si el mensaje ya fue procesado (duplicado).
 * @param {string} messageId
 */
function isDuplicate(messageId) {
  if (processed.has(messageId)) return true;
  processed.set(messageId, true);
  return false;
}

module.exports = { isDuplicate };
