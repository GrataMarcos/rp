'use strict';

const { sendMessage, sendButtonMessage } = require('../services/whatsapp');
const { parseExpense } = require('../services/openai');
const { addExpense } = require('../services/sheets');
const { getSession, setSession, clearSession } = require('../utils/session');
const { getCategory } = require('../utils/categories');

const CONFIRM_WORDS = new Set(['sí', 'si', 'yes', 'ok', 'dale', 'confirmar', 'confirmo', 'listo', '👍', '✓', 'correcto']);
const CANCEL_WORDS  = new Set(['no', 'nope', 'cancelar', 'cancel', 'salir', '👎', '✗']);

/**
 * Punto de entrada principal para mensajes de texto.
 * Gestiona el flujo de conversación: idle → confirming → idle.
 */
async function handleText(from, text) {
  const session = getSession(from);

  if (session.state === 'confirming' && session.pendingExpense) {
    return handleConfirmation(from, text.trim(), session);
  }

  await processExpenseText(from, text.trim());
}

/**
 * Envía el texto a OpenAI, muestra el resultado y pide confirmación.
 */
async function processExpenseText(from, text) {
  await sendMessage(from, '⏳ Procesando...');

  let expense;
  try {
    expense = await parseExpense(text);
  } catch (err) {
    console.error('[openai] parseExpense error:', err.message);
    await sendMessage(from, '❌ Error al consultar la IA. Intentá de nuevo en unos segundos.');
    return;
  }

  if (!expense.isExpense) {
    await sendMessage(
      from,
      '🤔 No detecté un gasto en ese mensaje.\n\n' +
      'Ejemplos válidos:\n' +
      '• "gasté 1500 en pizza"\n' +
      '• "taxi 800"\n' +
      '• "Netflix 15 dólares"\n\n' +
      'Para ver comandos disponibles enviá /ayuda'
    );
    return;
  }

  setSession(from, { state: 'confirming', pendingExpense: expense });

  const { emoji, label } = getCategory(expense.category);
  const amountStr = expense.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 });

  const confirmText =
    `✅ *¿Registro este gasto?*\n\n` +
    `💰 Monto: $${amountStr} ${expense.currency}\n` +
    `${emoji} Categoría: ${label}\n` +
    `📝 Descripción: ${expense.description}\n` +
    `📅 Fecha: ${expense.date}\n\n` +
    `Respondé *Sí* para guardar o *No* para cancelar.\n` +
    `También podés corregirlo reescribiéndolo.`;

  await sendButtonMessage(from, confirmText, ['Sí', 'No']);
}

/**
 * Procesa la respuesta del usuario ante un gasto pendiente de confirmación.
 */
async function handleConfirmation(from, text, session) {
  const lower = text.toLowerCase();

  if ([...CONFIRM_WORDS].some(w => lower === w || lower.startsWith(w + ' '))) {
    // Confirmar y guardar
    try {
      await addExpense(session.pendingExpense);
      clearSession(from);

      const { emoji, label } = getCategory(session.pendingExpense.category);
      const amountStr = session.pendingExpense.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 });

      await sendMessage(
        from,
        `✅ *Gasto guardado en Google Sheets*\n\n` +
        `${emoji} ${session.pendingExpense.description}\n` +
        `💰 $${amountStr} ${session.pendingExpense.currency}\n` +
        `📅 ${session.pendingExpense.date}`
      );
    } catch (err) {
      console.error('[sheets] addExpense error:', err.message);
      await sendMessage(from, '❌ No pude guardar en Google Sheets. Verificá la configuración.');
    }

  } else if ([...CANCEL_WORDS].some(w => lower === w)) {
    clearSession(from);
    await sendMessage(from, '❌ Gasto cancelado. Podés registrar uno nuevo cuando quieras.');

  } else {
    // Tratar como corrección: re-parsear el nuevo texto
    clearSession(from);
    await processExpenseText(from, text);
  }
}

module.exports = { handleText, processExpenseText };
