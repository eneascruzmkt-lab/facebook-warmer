const chalk = require('chalk');

async function runDay1(page, cursor, logger, profileAlias) {
  logger.setTotalActions(0);
  console.log('');
  console.log(chalk.yellow.bold('  📱 DIA 1 — AÇÃO MANUAL NO CELULAR'));
  console.log(chalk.yellow('  ─────────────────────────────────'));
  console.log(chalk.white('  1. Usar outra internet (dados móveis)'));
  console.log(chalk.white('  2. Criar perfil no celular'));
  console.log(chalk.white('  3. Completar informações básicas'));
  console.log(chalk.white('  4. Foto de perfil + capa'));
  console.log(chalk.white('  5. Rolar reels (20 minutos)'));
  console.log(chalk.white('  6. Não curtir muito'));
  console.log('');
  console.log(chalk.gray('  Nada para automatizar neste dia.'));
  logger.printFooter();
}

module.exports = { runDay1 };
