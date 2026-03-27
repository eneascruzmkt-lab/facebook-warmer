const { humanClick, sleep, randInt, humanType, shortDelay, waitForEnter, askQuestion } = require('../human');
const { updateProfile } = require('../profiles');

async function setup2FA(page, cursor, logger, profileAlias) {
  logger.progress('Configurando 2FA...');

  await page.goto('https://accountscenter.facebook.com/password_and_security/two_factor', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(randInt(3000, 6000));

  try {

    logger.manual('Copie o código/chave secreta que o Facebook mostra');
    await waitForEnter('   → Pressione ENTER após copiar a chave... ');

    const secretKey = await askQuestion('   → Cole a chave secreta aqui: ');

    logger.progress('Abrindo 2fa.live para gerar código...');
    const newPage = await page.browser().newPage();
    await newPage.goto('https://2fa.live/', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(randInt(2000, 4000));

    const secretInput = await newPage.$('input[type="text"], input[placeholder*="secret"], #secret');
    if (secretInput) {
      await secretInput.click();
      await newPage.keyboard.type(secretKey);
      await sleep(randInt(1000, 2000));

      const generateBtn = await newPage.$('button[type="submit"], button');
      if (generateBtn) await generateBtn.click();
      await sleep(randInt(2000, 4000));

      const codeEl = await newPage.$('.totp-code, #otp, [data-testid="code"]');
      let totpCode = null;

      if (codeEl) {
        totpCode = await newPage.evaluate(el => el.textContent.trim(), codeEl);
      }

      if (!totpCode) {
        logger.manual('Copie o código TOTP gerado no 2fa.live');
        totpCode = await askQuestion('   → Cole o código TOTP: ');
      }

      await newPage.close();

      const codeInput = await page.$('input[name="code"], input[type="text"]');
      if (codeInput) {
        await humanClick(cursor, codeInput);
        await humanType(page, totpCode);
        await shortDelay();

        const confirmBtn = await page.$('button[type="submit"], [data-testid="confirm"]');
        if (confirmBtn) await humanClick(cursor, confirmBtn);
        await sleep(randInt(3000, 5000));
      }

      updateProfile(profileAlias, { twoFactorSecret: secretKey });
      logger.success('2FA configurado com sucesso');
    } else {
      throw new Error('Campo de chave secreta não encontrado em 2fa.live');
    }
  } catch (e) {
    logger.error(`Falha no 2FA: ${e.message}`);
    logger.manual('Configure o 2FA manualmente');
    await waitForEnter('   → Pressione ENTER quando terminar... ');
  }
}

module.exports = { setup2FA };
