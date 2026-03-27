const { humanClick, sleep, randInt } = require('../human');

async function watchStories(page, cursor, logger) {
  const max = randInt(3, 8);
  logger.progress(`Assistindo ~${max} stories...`);

  await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(randInt(2000, 5000));

  let watched = 0;

  try {
    // Click on the first story in the stories bar at the top
    const storyItems = await page.$$('[aria-label="Story"], [aria-label="Stories"] a, [data-testid="story"]');

    if (storyItems.length === 0) {
      // Try alternative: click on story tray
      const storyTray = await page.$('[aria-roledescription="carousel"] [role="button"]');
      if (storyTray) {
        await humanClick(cursor, storyTray);
        await sleep(randInt(2000, 4000));
      } else {
        logger.skip('Nenhum story encontrado');
        return { count: 0 };
      }
    } else {
      // Click on a random story (skip first which is "create story")
      const idx = Math.min(1, storyItems.length - 1);
      await humanClick(cursor, storyItems[idx]);
      await sleep(randInt(2000, 4000));
    }

    // Watch stories by clicking "next" or waiting
    for (let i = 0; i < max; i++) {
      // Watch current story for variable time
      const watchTime = randInt(3000, 8000);
      await sleep(watchTime);

      // 15% chance: react to the story
      if (Math.random() < 0.15) {
        try {
          const reactBtn = await page.$('[aria-label="React to story"], [aria-label="Reagir"]');
          if (reactBtn) {
            await humanClick(cursor, reactBtn);
            await sleep(randInt(1000, 2000));
            // Click a reaction
            const reactions = await page.$$('[role="button"][aria-label]');
            if (reactions.length > 0) {
              const r = reactions[Math.floor(Math.random() * Math.min(reactions.length, 3))];
              await humanClick(cursor, r);
              logger.success(`Reagiu a um story`);
            }
            await sleep(randInt(1000, 2000));
          }
        } catch (e) { /* ignore */ }
      }

      watched++;

      // Go to next story
      try {
        await page.keyboard.press('ArrowRight');
        await sleep(randInt(500, 1500));
      } catch (e) {
        break; // No more stories
      }
    }

    // Close stories (press Escape or click close)
    try {
      await page.keyboard.press('Escape');
    } catch (e) { /* ignore */ }

  } catch (e) {
    logger.skip('Erro ao assistir stories: ' + e.message);
    return { count: watched };
  }

  if (watched > 0) {
    logger.success(`Assistiu ${watched} stories`);
  }

  return { count: watched };
}

module.exports = { watchStories };
