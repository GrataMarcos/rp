'use strict';

const { getMediaUrl, downloadMedia, sendMessage } = require('../services/whatsapp');
const { transcribeAudio } = require('../services/openai');
const { processExpenseText } = require('./textHandler');

/**
 * Maneja mensajes de audio (notas de voz).
 * Flujo: descarga → transcripción Whisper → parseo de gasto → confirmación
 *
 * @param {string} from
 * @param {{ id: string, mime_type: string }} audioMessage
 */
async function handleAudio(from, audioMessage) {
  await sendMessage(from, '🎤 Escuchando tu nota de voz...');

  let audioBuffer;
  try {
    const mediaUrl = await getMediaUrl(audioMessage.id);
    audioBuffer = await downloadMedia(mediaUrl);
  } catch (err) {
    console.error('[whatsapp] downloadMedia error:', err.message);
    await sendMessage(from, '❌ No pude descargar el audio. Intentá de nuevo o enviá un mensaje de texto.');
    return;
  }

  let transcription;
  try {
    transcription = await transcribeAudio(audioBuffer, audioMessage.mime_type);
  } catch (err) {
    console.error('[openai] transcribeAudio error:', err.message);
    await sendMessage(from, '❌ No pude transcribir el audio. Intentá enviar un mensaje de texto.');
    return;
  }

  if (!transcription) {
    await sendMessage(from, '❌ No entendí el audio. Intentá con un mensaje de texto.');
    return;
  }

  await sendMessage(from, `🎤 *Escuché:* "${transcription}"`);
  await processExpenseText(from, transcription);
}

module.exports = { handleAudio };
