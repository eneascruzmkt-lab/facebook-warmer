const { humanClick, sleep, randInt, humanScroll } = require('../human');
const config = require('../../config.json');

async function followPages(page, cursor, logger, intensity = null) {
  const max = intensity === 'low' ? randInt(1, 2) : randInt(1, config.follows?.max || 3);
  logger.progress(`Seguindo ~${max} páginas...`);

  // Scroll the feed or reels looking for follow buttons
  await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(randInt(2000, 5000));

  let followed = 0;

  for (let attempt = 0; attempt < max * 4 && followed < max; attempt++) {
    await humanScroll(page);
    await sleep(randInt(3000, 8000));

    try {
      // Look for Follow/Seguir buttons on posts and suggested pages
      const followButtons = await page.$$('[aria-label="Follow"], [aria-label="Seguir"]');

      if (followButtons.length > 0) {
        const btn = followButtons[Math.floor(Math.random() * Math.min(followButtons.length, 3))];
        const isVisible = await btn.isIntersectingViewport();

        if (isVisible) {
          await humanClick(cursor, btn);
          followed++;
          logger.success(`Seguiu página (${followed}/${max})`);

          // Wait between follows
          await sleep(randInt(20000, 60000));
        }
      }
    } catch (e) {
      // Button may have disappeared
    }
  }

  if (followed === 0) {
    logger.skip('Nenhum botão de seguir encontrado');
  }

  return { count: followed };
}

module.exports = { followPages };
