const { sleep, randInt } = require('../human');
const config = require('../../config.json');

async function watchLive(page, cursor, logger) {
  const durationMin = config.live.duration;
  logger.progress(`Buscando live para assistir ${durationMin}min...`);

  await page.goto('https://www.facebook.com/watch/live/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(randInt(3000, 6000));

  let liveFound = false;
  const liveSelectors = ['[aria-label="Live video"]', 'a[href*="/live/"]', '[data-testid="video_live"]'];

  for (const selector of liveSelectors) {
    try {
      const el = await page.$(selector);
      if (el) {
        await el.click();
        liveFound = true;
        break;
      }
    } catch (e) { /* try next */ }
  }

  if (!liveFound) {
    try {
      const videos = await page.$$('a[href*="/videos/"]');
      if (videos.length > 0) {
        await videos[0].click();
        liveFound = true;
      }
    } catch (e) { /* ignore */ }
  }

  if (!liveFound) {
    logger.error('Não encontrou nenhuma live');
    return { duration: 0, channel: null };
  }

  await sleep(randInt(3000, 6000));
  logger.progress(`Assistindo live... (0:00/${durationMin}min)`);

  const totalMs = durationMin * 60 * 1000;
  const startTime = Date.now();
  const updateInterval = 5 * 60 * 1000;
  let lastUpdate = startTime;

  while (Date.now() - startTime < totalMs) {
    await sleep(randInt(10000, 30000));

    if (Date.now() - lastUpdate > updateInterval) {
      const elapsed = Math.round((Date.now() - startTime) / 60000);
      logger.progress(`Assistindo live... (${elapsed}min/${durationMin}min)`);
      lastUpdate = Date.now();
    }

    if (Math.random() < 0.1) {
      await page.mouse.wheel({ deltaY: randInt(100, 300) });
    }
  }

  logger.success(`Live concluída (${durationMin}min)`);
  return { duration: `${durationMin}min`, channel: 'auto' };
}

module.exports = { watchLive };
