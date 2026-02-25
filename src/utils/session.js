'use strict';

const NodeCache = require('node-cache');
const config = require('../config');

// TTL configurable, checkperiod cada 60s
const cache = new NodeCache({ stdTTL: config.sessionTtlSeconds, checkperiod: 60 });

/**
 * @typedef {Object} Session
 * @property {'idle'|'confirming'} state
 * @property {Object|null} pendingExpense
 */

/** @returns {Session} */
function getSession(phoneNumber) {
  return cache.get(phoneNumber) || { state: 'idle', pendingExpense: null };
}

/** @param {string} phoneNumber @param {Session} session */
function setSession(phoneNumber, session) {
  cache.set(phoneNumber, session);
}

function clearSession(phoneNumber) {
  cache.del(phoneNumber);
}

module.exports = { getSession, setSession, clearSession };
