const { humanScroll, sleep, randInt, maybeWait } = require('../human');

async function scrollFeed(page, cursor, logger, durationMin = 20) {
  logger.progress(`Rolando feed por ~${durationMin}min...`);

  await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(randInt(2000, 5000));

  const endTime = Date.now() + durationMin * 60 * 1000;

  while (Date.now() < endTime) {
    await humanScroll(page);
    await sleep(randInt(2000, 8000));

    if (Math.random() < 0.1) {
      await sleep(randInt(10000, 30000));
    }

    await maybeWait();
  }

  logger.success(`Feed rolado por ${durationMin}min`);
}

module.exports = { scrollFeed };
