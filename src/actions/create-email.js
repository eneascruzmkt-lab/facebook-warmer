const { humanType, humanClick, sleep, randInt, shortDelay, waitForEnter, askQuestion } = require('../human');
const { updateProfile } = require('../profiles');

async function createEmail(page, cursor, logger, profileAlias) {
  logger.progress('Abrindo Outlook para criar email...');

  await page.goto('https://signup.live.com/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(randInt(3000, 6000));

  const variations = [
    `${profileAlias}.wel`,
    `wel.${profileAlias}`,
    `${profileAlias}mk`,
    `mk${profileAlias}`
  ];
  const emailName = variations[Math.floor(Math.random() * variations.length)];
  const domains = ['@outlook.com', '@hotmail.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  const fullEmail = emailName + domain;

  logger.progress(`Tentando criar: ${fullEmail}`);

  try {
    const emailInput = await page.$('input[name="MemberName"], input[type="email"]');
    if (emailInput) {
      await humanClick(cursor, emailInput);
      await humanType(page, emailName);
      await shortDelay();
    }

    const domainSelect = await page.$('select#LiveDomainBoxList');
    if (domainSelect) {
      await page.select('select#LiveDomainBoxList', domain.replace('@', ''));
    }

    const nextBtn = await page.$('#iSignupAction, [type="submit"]');
    if (nextBtn) await humanClick(cursor, nextBtn);
    await sleep(randInt(3000, 5000));

    logger.manual('Complete o cadastro manualmente (captcha/senha/telefone)');
    await waitForEnter('   → Pressione ENTER quando terminar o cadastro... ');

    const password = await askQuestion('   → Digite a senha criada: ');

    updateProfile(profileAlias, { email: fullEmail, emailPassword: password });
    logger.success(`Email criado e salvo: ${fullEmail}`);

    return { email: fullEmail };
  } catch (e) {
    logger.error(`Falha ao criar email: ${e.message}`);
    logger.manual('Crie o email manualmente');
    await waitForEnter('   → Pressione ENTER quando terminar... ');
    return { email: null };
  }
}

module.exports = { createEmail };
