const { humanClick, humanScroll, sleep, randInt, shortDelay, createHumanCursor } = require('../human');
const config = require('../../config.json');

async function likePosts(page, cursor, logger, intensity = null) {
  const max = intensity === 'low' ? randInt(1, 3) : randInt(config.likes.min, config.likes.max);
  logger.progress(`Curtindo ~${max} posts...`);

  await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(randInt(2000, 4000));

  let liked = 0;

  for (let attempt = 0; attempt < max * 3 && liked < max; attempt++) {
    await humanScroll(page);
    await sleep(randInt(3000, 8000));

    try {
      const likeButtons = await page.$$('[aria-label="Like"], [aria-label="Curtir"]');

      if (likeButtons.length > 0) {
        const btn = likeButtons[Math.floor(Math.random() * likeButtons.length)];
        const isVisible = await btn.isIntersectingViewport();

        if (isVisible) {
          await humanClick(cursor, btn);
          liked++;
          logger.success(`Curtiu post (${liked}/${max})`);

          await sleep(randInt(30000, 120000));
        }
      }
    } catch (e) {
      // Element gone, keep scrolling
    }
  }

  if (liked === 0) {
    logger.error('Não conseguiu curtir nenhum post');
  }

  return { count: liked };
}

module.exports = { likePosts };
