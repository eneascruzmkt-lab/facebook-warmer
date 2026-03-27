const { humanClick, sleep, randInt, humanScroll } = require('../human');
const config = require('../../config.json');

async function joinGroups(page, cursor, logger) {
  const max = randInt(config.groups.min, config.groups.max);
  logger.progress(`Entrando em ~${max} grupos sugeridos...`);

  await page.goto('https://www.facebook.com/groups/discover', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(randInt(3000, 6000));

  let joined = 0;
  const groupNames = [];

  for (let i = 0; i < max; i++) {
    try {
      await humanScroll(page);
      await sleep(randInt(2000, 5000));

      const joinButtons = await page.$$('[aria-label="Join group"], [aria-label="Participar do grupo"], [aria-label="Participar"]');

      if (joinButtons.length > 0) {
        const btn = joinButtons[Math.floor(Math.random() * Math.min(joinButtons.length, 3))];
        await humanClick(cursor, btn);
        joined++;
        groupNames.push('grupo sugerido');
        logger.success(`Entrou em grupo (${joined}/${max})`);
        await sleep(randInt(30000, 60000));
      }
    } catch (e) {
      logger.error(`Falha ao entrar em grupo: ${e.message}`);
    }
  }

  return { count: joined, names: groupNames };
}

module.exports = { joinGroups };
