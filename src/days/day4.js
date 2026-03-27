const { createPage } = require('../actions/create-page');
const { publishPost } = require('../actions/publish-post');
const { generatePlan, addDayToHistory } = require('../randomizer');
const { humanDelay } = require('../human');
const { scrollFeed } = require('../actions/scroll-feed');
const { likePosts } = require('../actions/like-posts');
const { joinGroups } = require('../actions/join-groups');
const { addFriends } = require('../actions/add-friends');
const { followPages } = require('../actions/follow-pages');

const AVAILABLE_ACTIONS = [
  { name: 'scroll-feed', key: 'scrollFeed', fn: 'scrollFeed' },
  { name: 'like-posts', key: 'likes', fn: 'likePosts' },
  { name: 'join-groups', key: 'groups', fn: 'joinGroups' },
  { name: 'add-friends', key: 'friends', fn: 'addFriends' },
  { name: 'follow-pages', key: 'follows', fn: 'followPages' },
];

const ACTION_MAP = {
  scrollFeed: (page, cursor, logger, intensity) => scrollFeed(page, cursor, logger),
  likePosts: (page, cursor, logger, intensity) => likePosts(page, cursor, logger, intensity),
  joinGroups: (page, cursor, logger, intensity) => joinGroups(page, cursor, logger),
  addFriends: (page, cursor, logger, intensity) => addFriends(page, cursor, logger, intensity),
  followPages: (page, cursor, logger, intensity) => followPages(page, cursor, logger, intensity),
};

async function runDay4(page, cursor, logger, profileAlias) {
  const plan = generatePlan(profileAlias, 4, AVAILABLE_ACTIONS);
  logger.setTotalActions(plan.actions.length + 2);

  await createPage(page, cursor, logger);
  await humanDelay();

  await publishPost(page, cursor, logger);
  await humanDelay();

  const results = { page: true, post: true };
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

  addDayToHistory(profileAlias, {
    day: 4,
    date: new Date().toISOString().split('T')[0],
    startTime: logger.startTime.toLocaleTimeString('pt-BR', { hour12: false }),
    endTime: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
    actionsOrder: ['create-page', 'publish-post', ...plan.actions.map(a => a.name)],
    actions: results,
    errors: logger.entries.filter(e => e.type === 'error'),
    manualPauses: logger.entries.filter(e => e.type === 'manual'),
  });
}

module.exports = { runDay4, AVAILABLE_ACTIONS };
