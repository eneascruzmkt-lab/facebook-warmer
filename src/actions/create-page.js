const { humanClick, humanType, sleep, randInt, shortDelay, waitForEnter } = require('../human');

async function createPage(page, cursor, logger) {
  logger.progress('Criando página do Facebook...');

  await page.goto('https://www.facebook.com/pages/create/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(randInt(3000, 6000));

  try {
    const nameInput = await page.$('input[name="page_name"], input[placeholder*="nome"], input[aria-label*="Page name"], input[aria-label*="Nome da página"]');
    if (nameInput) {
      const pageNames = ['Dicas do Dia', 'Vida & Saúde', 'Mundo Digital', 'Receitas Fáceis BR', 'Cotidiano Criativo'];
      const pageName = pageNames[Math.floor(Math.random() * pageNames.length)];

      await humanClick(cursor, nameInput);
      await humanType(page, pageName);
      await shortDelay();

      logger.progress(`Nome da página: ${pageName}`);
    }

    const categoryInput = await page.$('input[aria-label*="Category"], input[aria-label*="Categoria"], input[placeholder*="categoria"]');
    if (categoryInput) {
      await humanClick(cursor, categoryInput);
      await humanType(page, 'Blog pessoal');
      await sleep(randInt(2000, 4000));
      await page.keyboard.press('ArrowDown');
      await sleep(500);
      await page.keyboard.press('Enter');
      await shortDelay();
    }

    const createBtn = await page.$('button[type="submit"], [aria-label*="Create"], [aria-label*="Criar"]');
    if (createBtn) {
      await humanClick(cursor, createBtn);
      await sleep(randInt(5000, 10000));
    }

    logger.success('Página criada');
  } catch (e) {
    logger.error(`Falha ao criar página: ${e.message}`);
    logger.manual('Crie a página manualmente');
    await waitForEnter('   → Pressione ENTER quando terminar... ');
  }
}

module.exports = { createPage };
