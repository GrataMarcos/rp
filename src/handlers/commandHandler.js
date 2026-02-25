'use strict';

const { sendMessage } = require('../services/whatsapp');
const { getRecentExpenses, getMonthlySummary } = require('../services/sheets');
const { CATEGORIES, getCategory } = require('../utils/categories');
const { clearSession } = require('../utils/session');

const HELP_TEXT = `🤖 *Bot de Gastos — Ayuda*

*Registrar un gasto:*
Enviá un mensaje de texto o una nota de voz describiendo el gasto.
Ejemplos:
  • "gasté 1500 en pizza"
  • "taxi 800 pesos"
  • "Netflix 15 dólares"
  • "supermercado 12400"

*Comandos:*
/resumen — Resumen del mes actual
/recientes — Últimos 5 gastos registrados
/categorias — Ver categorías disponibles
/cancelar — Cancelar operación en curso
/ayuda — Mostrar esta ayuda

*Notas de voz:*
Podés enviar un audio y el bot lo transcribe automáticamente 🎤`;

/**
 * Despacha un comando slash al handler correspondiente.
 * @param {string} from   Número del remitente
 * @param {string} command Texto completo del mensaje (ej. "/resumen")
 */
async function handleCommand(from, command) {
  const cmd = command.toLowerCase().trim().split(/\s+/)[0];

  switch (cmd) {
    case '/ayuda':
    case '/help':
      await sendMessage(from, HELP_TEXT);
      break;

    case '/cancelar':
    case '/cancel':
      clearSession(from);
      await sendMessage(from, '❌ Operación cancelada.');
      break;

    case '/resumen':
    case '/summary':
      await handleSummary(from);
      break;

    case '/recientes':
    case '/recent':
      await handleRecent(from);
      break;

    case '/categorias':
    case '/categories':
      await handleCategories(from);
      break;

    default:
      await sendMessage(from, '❓ Comando desconocido. Enviá /ayuda para ver los disponibles.');
  }
}

async function handleSummary(from) {
  await sendMessage(from, '⏳ Calculando resumen...');

  const { summary, count } = await getMonthlySummary();

  const now = new Date();
  const monthLabel = now.toLocaleString('es-AR', {
    month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires',
  });

  if (count === 0) {
    await sendMessage(from, `📊 No hay gastos registrados en ${monthLabel}.`);
    return;
  }

  let msg = `📊 *Resumen de ${monthLabel}*\nTotal de transacciones: ${count}\n`;

  for (const [currency, data] of Object.entries(summary)) {
    const total = data.total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    msg += `\n*${currency}* — Total: $${total}\n`;

    // Ordenar categorías de mayor a menor gasto
    const sorted = Object.entries(data.categories).sort((a, b) => b[1] - a[1]);
    for (const [cat, amount] of sorted) {
      const { emoji, label } = getCategory(cat);
      const pct = ((amount / data.total) * 100).toFixed(1);
      const amtStr = amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      msg += `  ${emoji} ${label}: $${amtStr} (${pct}%)\n`;
    }
  }

  await sendMessage(from, msg);
}

async function handleRecent(from) {
  await sendMessage(from, '⏳ Buscando gastos recientes...');

  const expenses = await getRecentExpenses(5);

  if (expenses.length === 0) {
    await sendMessage(from, '📝 No hay gastos registrados aún. ¡Registrá tu primer gasto!');
    return;
  }

  let msg = '📋 *Últimos gastos:*\n\n';
  expenses.forEach((row, i) => {
    const { emoji } = getCategory(row[3]);
    const amount = parseFloat(row[1]).toLocaleString('es-AR', { minimumFractionDigits: 2 });
    msg += `${i + 1}. ${emoji} *${row[4] || 'Sin descripción'}*\n`;
    msg += `   💰 $${amount} ${row[2] || ''}\n`;
    msg += `   📅 ${row[0]}\n\n`;
  });

  await sendMessage(from, msg.trim());
}

async function handleCategories(from) {
  let msg = '📂 *Categorías disponibles:*\n\n';
  for (const { emoji, label } of Object.values(CATEGORIES)) {
    msg += `${emoji} ${label}\n`;
  }
  msg += '\nEl bot detecta la categoría automáticamente según tu descripción.';
  await sendMessage(from, msg);
}

module.exports = { handleCommand };
