const { humanClick, humanType, sleep, randInt, shortDelay } = require('../human');
const config = require('../../config.json');

async function publishPost(page, cursor, logger) {
  logger.progress('Publicando post na página...');

  try {
    await page.goto('https://www.facebook.com/pages/?category=your_pages', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(randInt(3000, 6000));

    const pageLink = await page.$('a[href*="/pages/"][href*="profile"]');
    if (pageLink) {
      await humanClick(cursor, pageLink);
      await sleep(randInt(3000, 6000));
    }

    const postBox = await page.$('[aria-label*="Create a post"], [aria-label*="Criar publicação"], [role="button"][tabindex="0"]');
    if (postBox) {
      await humanClick(cursor, postBox);
      await sleep(randInt(2000, 4000));
    }

    const templates = config.postTemplates || ['Bom dia!'];
    const content = templates[Math.floor(Math.random() * templates.length)];
    await humanType(page, content);
    await shortDelay();

    const publishBtn = await page.$('[aria-label="Post"], [aria-label="Publicar"], [data-testid="post_button"]');
    if (publishBtn) {
      await humanClick(cursor, publishBtn);
      await sleep(randInt(5000, 8000));
    }

    logger.success('Post publicado');
  } catch (e) {
    logger.error(`Falha ao publicar post: ${e.message}`);
  }
}

module.exports = { publishPost };
