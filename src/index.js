'use strict';

require('dotenv').config();

const express = require('express');
const config = require('./config');
const webhookRouter = require('./routes/webhook');

const app = express();

// Parseo de JSON — necesario para el webhook de Meta
app.use(express.json());

// Health check para plataformas de deploy (Railway, Render, etc.)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/webhook', webhookRouter);

// Ruta raíz informativa
app.get('/', (_req, res) => {
  res.json({
    name: 'expense-bot-whatsapp',
    version: '1.0.0',
    webhook: '/webhook',
    health: '/health',
  });
});

app.listen(config.port, () => {
  console.log(`🚀 Expense Bot corriendo en puerto ${config.port}`);
  console.log(`📌 Webhook URL: https://<tu-dominio>/webhook`);
});
