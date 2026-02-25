'use strict';

const express = require('express');
const config = require('../config');
const { handleMessage } = require('../handlers/messageHandler');

const router = express.Router();

/**
 * GET /webhook
 * Verificación del webhook requerida por Meta antes de activarlo.
 */
router.get('/', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
    console.log('✅ Webhook verificado por Meta');
    return res.status(200).send(challenge);
  }

  console.warn('⚠️  Verificación de webhook fallida — token incorrecto');
  res.sendStatus(403);
});

/**
 * POST /webhook
 * Recibe los eventos de mensajes de Meta.
 * Siempre respondemos 200 inmediatamente para evitar reintentos de Meta.
 */
router.post('/', (req, res) => {
  // Respuesta inmediata — el procesamiento es asíncrono
  res.sendStatus(200);

  const body = req.body;

  if (body.object !== 'whatsapp_business_account') return;

  const messages = body.entry?.[0]?.changes?.[0]?.value?.messages;
  if (!messages?.length) return;

  // Procesamos el primer mensaje del batch
  handleMessage(messages[0]).catch(err => {
    console.error('[webhook] Error no capturado en handleMessage:', err);
  });
});

module.exports = router;
