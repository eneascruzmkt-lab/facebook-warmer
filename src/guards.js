const { waitForEnter } = require('./human');

async function checkForVerification(page, logger) {
  const url = page.url();

  // Checkpoint detection
  if (url.includes('checkpoint') || url.includes('security_check')) {
    logger.manual('Facebook pediu verificação de segurança');
    await waitForEnter('   → Resolva a verificação manualmente e pressione ENTER... ');
    return true;
  }

  // Account disabled detection
  const content = await page.content().catch(() => '');
  if (content.includes('Your account has been disabled') ||
      content.includes('Sua conta foi desativada') ||
      content.includes('account is restricted')) {
    logger.error('Perfil bloqueado/desativado pelo Facebook');
    throw new Error('PROFILE_BLOCKED');
  }

  return false;
}

module.exports = { checkForVerification };
