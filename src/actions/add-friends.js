const { humanClick, sleep, randInt, humanScroll } = require('../human');
const config = require('../../config.json');

async function addFriends(page, cursor, logger, intensity = null) {
  const max = intensity === 'low' ? randInt(1, 2) : randInt(1, config.friends.max);
  logger.progress(`Adicionando ~${max} amigos...`);

  await page.goto('https://www.facebook.com/friends/suggestions', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(randInt(3000, 6000));

  let added = 0;

  for (let i = 0; i < max; i++) {
    try {
      const addButtons = await page.$$('[aria-label="Add friend"], [aria-label="Adicionar amigo"]');

      if (addButtons.length > 0) {
        const btn = addButtons[Math.floor(Math.random() * Math.min(addButtons.length, 5))];
        await humanClick(cursor, btn);
        added++;
        logger.success(`Amigo adicionado (${added}/${max})`);
        await sleep(randInt(30000, 90000));
      } else {
        await humanScroll(page);
        await sleep(randInt(3000, 6000));
      }
    } catch (e) {
      logger.error(`Falha ao adicionar amigo: ${e.message}`);
    }
  }

  return { count: added };
}

module.exports = { addFriends };
