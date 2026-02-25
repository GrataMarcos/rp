'use strict';

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../config');

const openai = new OpenAI({ apiKey: config.openai.apiKey });

// Mapeo de MIME types a extensiones que Whisper acepta
const MIME_TO_EXT = {
  'audio/ogg':  '.ogg',
  'audio/mpeg': '.mp3',
  'audio/mp4':  '.m4a',
  'audio/wav':  '.wav',
  'audio/webm': '.webm',
  'audio/aac':  '.aac',
};

const SYSTEM_PROMPT = `Eres un asistente para registrar gastos personales.
Extraé información de gastos a partir del mensaje del usuario y respondé SOLO con JSON válido.

JSON de respuesta cuando SÍ es un gasto:
{
  "isExpense": true,
  "amount": <número>,
  "currency": "<ARS|USD|EUR|otro>",
  "category": "<comida|supermercado|transporte|hogar|salud|entretenimiento|ropa|educacion|servicios|trabajo|viajes|otros>",
  "description": "<descripción breve, máx 60 chars>",
  "date": "<YYYY-MM-DD>"
}

JSON de respuesta cuando NO es un gasto:
{ "isExpense": false }

Reglas:
- La moneda por defecto es ${config.defaultCurrency}.
- Si el usuario no menciona fecha, usá el día de hoy: {{TODAY}}.
- Detectá palabras clave: "gasté", "pagué", "compré", "taxi", "uber", "mercado", etc.
- Para importes en miles: "1k" = 1000, "1.5k" = 1500.
- Si hay múltiples gastos en un mensaje, tomá el principal.`;

/**
 * Parsea un texto libre y extrae datos de un gasto.
 * @param {string} text
 * @returns {Promise<{isExpense:boolean, amount?:number, currency?:string, category?:string, description?:string, date?:string}>}
 */
async function parseExpense(text) {
  const today = new Date().toISOString().split('T')[0];
  const prompt = SYSTEM_PROMPT.replace('{{TODAY}}', today);

  const response = await openai.chat.completions.create({
    model: config.openai.model,
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: text },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 200,
    temperature: 0.1,
  });

  return JSON.parse(response.choices[0].message.content);
}

/**
 * Transcribe un buffer de audio usando Whisper.
 * @param {Buffer} audioBuffer
 * @param {string} mimeType  MIME type del audio (ej. 'audio/ogg')
 * @returns {Promise<string>} Texto transcripto
 */
async function transcribeAudio(audioBuffer, mimeType) {
  const ext = MIME_TO_EXT[mimeType] || '.ogg';
  const tmpPath = path.join(os.tmpdir(), `wa_audio_${Date.now()}${ext}`);

  fs.writeFileSync(tmpPath, audioBuffer);

  try {
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tmpPath),
      model: 'whisper-1',
      language: 'es',
    });
    return transcription.text.trim();
  } finally {
    fs.unlink(tmpPath, () => {}); // Limpieza asíncrona, no crítica
  }
}

module.exports = { parseExpense, transcribeAudio };
