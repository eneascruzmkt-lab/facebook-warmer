const { humanScroll, sleep, randInt } = require('../human');
const config = require('../../config.json');

async function watchReels(page, cursor, logger) {
  const duration = randInt(config.reels.durationMin, config.reels.durationMax);
  logger.progress(`Assistindo reels por ~${duration}min...`);

  await page.goto('https://www.facebook.com/reel/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(randInt(3000, 6000));

  const endTime = Date.now() + duration * 60 * 1000;

  while (Date.now() < endTime) {
    const watchTime = Math.random() < 0.3
      ? randInt(2000, 5000)
      : randInt(8000, 30000);

    await sleep(watchTime);

    try {
      await page.keyboard.press('ArrowDown');
      await sleep(randInt(500, 1500));
    } catch (e) {
      await humanScroll(page);
    }
  }

  logger.success(`Reels assistidos por ${duration}min`);
}

module.exports = { watchReels };
