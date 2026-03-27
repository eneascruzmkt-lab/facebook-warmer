const { humanClick, humanScroll, sleep, randInt } = require('../human');
const config = require('../../config.json');

async function reactPosts(page, cursor, logger, intensity = null) {
  const max = intensity === 'low' ? randInt(1, 3) : randInt(config.likes.min, config.likes.max);
  logger.progress(`Reagindo a ~${max} posts com reacoes variadas...`);

  await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(randInt(2000, 5000));

  let reacted = 0;
  const reactions = ['Like', 'Love', 'Haha', 'Wow', 'Curtir', 'Amei', 'Haha', 'Uau'];

  for (let attempt = 0; attempt < max * 3 && reacted < max; attempt++) {
    await humanScroll(page);
    await sleep(randInt(3000, 8000));

    try {
      const likeButtons = await page.$$('[aria-label="Like"], [aria-label="Curtir"]');

      if (likeButtons.length > 0) {
        const btn = likeButtons[Math.floor(Math.random() * likeButtons.length)];
        const isVisible = await btn.isIntersectingViewport();

        if (isVisible) {
          // 40% chance: just click like (normal)
          // 60% chance: hold to show reactions panel and pick one
          if (Math.random() < 0.4) {
            await humanClick(cursor, btn);
            reacted++;
            logger.success(`Curtiu post (${reacted}/${max})`);
          } else {
            // Hover/hold on like button to trigger reactions panel
            await cursor.move(btn);
            await sleep(randInt(1500, 2500)); // hold to show panel

            // Try to find reaction buttons
            const reactionBtns = await page.$$('[aria-label="Love"], [aria-label="Haha"], [aria-label="Wow"], [aria-label="Amei"], [aria-label="Haha"], [aria-label="Uau"]');

            if (reactionBtns.length > 0) {
              const reaction = reactionBtns[Math.floor(Math.random() * reactionBtns.length)];
              const reactionLabel = await page.evaluate(el => el.getAttribute('aria-label'), reaction);
              await humanClick(cursor, reaction);
              reacted++;
              logger.success(`Reagiu com "${reactionLabel}" (${reacted}/${max})`);
            } else {
              // Fallback: just click like
              await humanClick(cursor, btn);
              reacted++;
              logger.success(`Curtiu post (${reacted}/${max})`);
            }
          }

          await sleep(randInt(30000, 120000));
        }
      }
    } catch (e) {
      // Element gone
    }
  }

  if (reacted === 0) {
    logger.skip('Nenhuma reacao feita');
  }

  return { count: reacted };
}

module.exports = { reactPosts };
