const { generatePlan, addDayToHistory } = require('../randomizer');
const { humanDelay, waitForEnter } = require('../human');
const { scrollFeed } = require('../actions/scroll-feed');
const { likePosts } = require('../actions/like-posts');
const { watchReels } = require('../actions/watch-reels');
const { addFriends } = require('../actions/add-friends');
const { followPages } = require('../actions/follow-pages');
const { reactPosts } = require('../actions/react-posts');
const { watchStories } = require('../actions/watch-stories');

const AVAILABLE_ACTIONS = [
  { name: 'scroll-feed', key: 'scrollFeed', fn: 'scrollFeed' },
  { name: 'like-posts', key: 'likes', fn: 'likePosts' },
  { name: 'react-posts', key: 'reactions', fn: 'reactPosts' },
  { name: 'watch-reels', key: 'reels', fn: 'watchReels' },
  { name: 'watch-stories', key: 'stories', fn: 'watchStories' },
  { name: 'add-friends', key: 'friends', fn: 'addFriends' },
  { name: 'follow-pages', key: 'follows', fn: 'followPages' },
];

const ACTION_MAP = {
  scrollFeed: (page, cursor, logger, intensity) => scrollFeed(page, cursor, logger),
  likePosts: (page, cursor, logger, intensity) => likePosts(page, cursor, logger, intensity),
  reactPosts: (page, cursor, logger, intensity) => reactPosts(page, cursor, logger, intensity),
  watchReels: (page, cursor, logger, intensity) => watchReels(page, cursor, logger),
  watchStories: (page, cursor, logger) => watchStories(page, cursor, logger),
  addFriends: (page, cursor, logger, intensity) => addFriends(page, cursor, logger, intensity),
  followPages: (page, cursor, logger, intensity) => followPages(page, cursor, logger, intensity),
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
