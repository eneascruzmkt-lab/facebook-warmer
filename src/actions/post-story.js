const { humanClick, humanType, sleep, randInt, shortDelay } = require('../human');

const STORY_TEXTS = [
  'bom dia',
  'mais um dia',
  'foco total',
  'gratidao',
  'vamos que vamos',
  'dia produtivo',
  'boa noite',
  'que dia lindo',
  'cafe e foco',
  'nunca desista',
];

async function postStory(page, cursor, logger) {
  logger.progress('Publicando story...');

  try {
    await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(randInt(2000, 5000));

    // Click "Create story" / "Criar story"
    const createStory = await page.$('[aria-label="Create story"], [aria-label="Criar story"], [aria-label="Create Story"]');

    if (!createStory) {
      logger.skip('Botao de criar story nao encontrado');
      return false;
    }

    await humanClick(cursor, createStory);
    await sleep(randInt(3000, 6000));

    // Look for "Create a text story" option
    const textOption = await page.$('[aria-label="Create a text story"], [aria-label="Criar um story de texto"], [data-testid="story-text"]');
    if (textOption) {
      await humanClick(cursor, textOption);
      await sleep(randInt(2000, 4000));
    }

    // Type text
    const text = STORY_TEXTS[Math.floor(Math.random() * STORY_TEXTS.length)];
    const textArea = await page.$('[role="textbox"], textarea, [contenteditable="true"]');
    if (textArea) {
      await humanClick(cursor, textArea);
      await humanType(page, text);
      await shortDelay();
    }

    // Click share/publish
    await sleep(randInt(2000, 4000));
    const publishBtn = await page.$('[aria-label="Share to story"], [aria-label="Compartilhar no story"], [aria-label="Post"], [aria-label="Publicar"]');
    if (publishBtn) {
      await humanClick(cursor, publishBtn);
      await sleep(randInt(5000, 8000));
      logger.success(`Story publicado: "${text}"`);
      return true;
    } else {
      logger.skip('Botao de publicar story nao encontrado');
      return false;
    }
  } catch (e) {
    logger.error(`Falha ao publicar story: ${e.message}`);
    return false;
  }
}

module.exports = { postStory };
