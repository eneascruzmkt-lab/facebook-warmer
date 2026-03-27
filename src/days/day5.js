const { generatePlan, addDayToHistory } = require('../randomizer');
const { humanDelay, waitForEnter } = require('../human');
const { scrollFeed } = require('../actions/scroll-feed');
const { likePosts } = require('../actions/like-posts');
const { watchReels } = require('../actions/watch-reels');
const { addFriends } = require('../actions/add-friends');

const AVAILABLE_ACTIONS = [
  { name: 'scroll-feed', key: 'scrollFeed', fn: 'scrollFeed' },
  { name: 'like-posts', key: 'likes', fn: 'likePosts' },
  { name: 'watch-reels', key: 'reels', fn: 'watchReels' },
  { name: 'add-friends', key: 'friends', fn: 'addFriends' },
];

const ACTION_MAP = {
  scrollFeed: (page, cursor, logger, intensity) => scrollFeed(page, cursor, logger),
  likePosts: (page, cursor, logger, intensity) => likePosts(page, cursor, logger, intensity),
  watchReels: (page, cursor, logger, intensity) => watchReels(page, cursor, logger),
  addFriends: (page, cursor, logger, intensity) => addFriends(page, cursor, logger, intensity),
};

async function runDay5(page, cursor, logger, profileAlias) {
  const plan = generatePlan(profileAlias, 5, AVAILABLE_ACTIONS);
  logger.setTotalActions(plan.actions.length + 1);

  const results = {};
  for (const action of plan.actions) {
    try {
      const result = await ACTION_MAP[action.fn](page, cursor, logger, action.intensity);
      results[action.key] = result || true;
    } catch (e) {
      logger.error(`${action.name}: ${e.message}`);
      results[action.key] = false;
    }
    await humanDelay();
  }

  logger.manual('Criar BM e conta de anúncio');
  await waitForEnter('   → Crie a BM e conta de anúncio manualmente. Pressione ENTER quando terminar... ');
  logger.success('BM criada (manual)');
  results.bm = 'manual';

  addDayToHistory(profileAlias, {
    day: 5,
    date: new Date().toISOString().split('T')[0],
    startTime: logger.startTime.toLocaleTimeString('pt-BR', { hour12: false }),
    endTime: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
    actionsOrder: [...plan.actions.map(a => a.name), 'create-bm'],
    actions: results,
    errors: logger.entries.filter(e => e.type === 'error'),
    manualPauses: logger.entries.filter(e => e.type === 'manual'),
  });
}

module.exports = { runDay5, AVAILABLE_ACTIONS };
