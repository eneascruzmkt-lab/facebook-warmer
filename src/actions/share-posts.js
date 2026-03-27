const { humanClick, humanScroll, sleep, randInt } = require('../human');

async function sharePosts(page, cursor, logger, intensity = null) {
  const max = intensity === 'low' ? 1 : randInt(1, 2);
  logger.progress(`Compartilhando ~${max} posts...`);

  await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(randInt(2000, 5000));

  let shared = 0;

  for (let attempt = 0; attempt < max * 4 && shared < max; attempt++) {
    await humanScroll(page);
    await sleep(randInt(3000, 8000));

    try {
      // Find share buttons
      const shareBtns = await page.$$('[aria-label="Send this to friends or post it on your timeline."], [aria-label="Share"], [aria-label="Compartilhar"]');

      if (shareBtns.length > 0) {
        const btn = shareBtns[Math.floor(Math.random() * Math.min(shareBtns.length, 3))];
        const isVisible = await btn.isIntersectingViewport();

        if (isVisible) {
          await humanClick(cursor, btn);
          await sleep(randInt(2000, 4000));

          // Look for "Share now" / "Compartilhar agora" option
          const shareNow = await page.$('[aria-label="Share now"], [aria-label="Compartilhar agora"], [role="menuitem"]');
          if (shareNow) {
            await humanClick(cursor, shareNow);
            shared++;
            logger.success(`Compartilhou post (${shared}/${max})`);
            await sleep(randInt(60000, 120000));
          } else {
            // Close the menu
            await page.keyboard.press('Escape');
            await sleep(randInt(1000, 2000));
          }
        }
      }
    } catch (e) {
      // Element gone
    }
  }

  if (shared === 0) {
    logger.skip('Nenhum post compartilhado');
  }

  return { count: shared };
}

module.exports = { sharePosts };
