const { humanScroll, humanClick, sleep, randInt } = require('../human');

async function browseMarketplace(page, cursor, logger) {
  logger.progress('Navegando marketplace...');

  await page.goto('https://www.facebook.com/marketplace', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(randInt(3000, 6000));

  const itemsToView = randInt(3, 8);
  let viewed = 0;

  for (let i = 0; i < itemsToView; i++) {
    await humanScroll(page);
    await sleep(randInt(2000, 5000));

    try {
      const items = await page.$$('a[href*="/marketplace/item/"]');
      if (items.length > 0) {
        const item = items[Math.floor(Math.random() * Math.min(items.length, 5))];
        await humanClick(cursor, item);
        viewed++;

        await sleep(randInt(5000, 15000));
        await humanScroll(page);
        await sleep(randInt(2000, 5000));

        await page.goBack({ waitUntil: 'networkidle2' });
        await sleep(randInt(2000, 4000));
      }
    } catch (e) {
      // Item may have disappeared
    }
  }

  logger.success(`Marketplace navegado (${viewed} itens vistos)`);
  return true;
}

module.exports = { browseMarketplace };
