const { humanClick, humanScroll, humanType, sleep, randInt, shortDelay } = require('../human');

const COMMENTS = [
  'muito bom!', 'que legal', 'interessante', 'adorei', 'top demais',
  'sensacional', 'show', 'incrivel', 'arrasou', 'perfeito',
  'que massa', 'concordo', 'verdade', 'demais', 'maravilhoso',
  'parabens', 'amei isso', 'muito bom isso', 'otimo conteudo', 'nota 10',
  'que bacana', 'uau', 'genial', 'excelente', 'isso ai'
];

async function commentPosts(page, cursor, logger, intensity = null) {
  const max = intensity === 'low' ? randInt(1, 2) : randInt(1, 3);
  logger.progress(`Comentando em ~${max} posts...`);

  await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2', timeout: 30000 });
  await sleep(randInt(2000, 5000));

  let commented = 0;

  for (let attempt = 0; attempt < max * 4 && commented < max; attempt++) {
    await humanScroll(page);
    await sleep(randInt(3000, 8000));

    try {
      // Find comment buttons/links
      const commentBtns = await page.$$('[aria-label="Leave a comment"], [aria-label="Deixe um comentário"], [aria-label="Comment"], [aria-label="Comentar"]');

      if (commentBtns.length > 0) {
        const btn = commentBtns[Math.floor(Math.random() * Math.min(commentBtns.length, 3))];
        const isVisible = await btn.isIntersectingViewport();

        if (isVisible) {
          await humanClick(cursor, btn);
          await sleep(randInt(1500, 3000));

          // Pick random comment
          const comment = COMMENTS[Math.floor(Math.random() * COMMENTS.length)];

          // Type the comment
          await humanType(page, comment);
          await sleep(randInt(500, 1500));

          // Press Enter to submit
          await page.keyboard.press('Enter');
          commented++;
          logger.success(`Comentou: "${comment}" (${commented}/${max})`);

          // Wait between comments
          await sleep(randInt(60000, 180000));
        }
      }
    } catch (e) {
      // Element gone, keep scrolling
    }
  }

  if (commented === 0) {
    logger.skip('Nenhum post comentado');
  }

  return { count: commented };
}

module.exports = { commentPosts };
