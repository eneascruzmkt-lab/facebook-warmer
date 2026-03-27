const { scrollFeed } = require('../actions/scroll-feed');
const { likePosts } = require('../actions/like-posts');
const { watchLive } = require('../actions/watch-live');
const { browseMarketplace } = require('../actions/browse-marketplace');
const { joinGroups } = require('../actions/join-groups');
const { addFriends } = require('../actions/add-friends');
const { followPages } = require('../actions/follow-pages');
const { commentPosts } = require('../actions/comment-posts');
const { reactPosts } = require('../actions/react-posts');
const { watchStories } = require('../actions/watch-stories');
const { sharePosts } = require('../actions/share-posts');
const { postStory } = require('../actions/post-story');
const { generatePlan, addDayToHistory } = require('../randomizer');
const { humanDelay, createHumanCursor } = require('../human');

const AVAILABLE_ACTIONS = [
  { name: 'scroll-feed', key: 'scrollFeed', fn: 'scrollFeed' },
  { name: 'like-posts', key: 'likes', fn: 'likePosts' },
  { name: 'react-posts', key: 'reactions', fn: 'reactPosts' },
  { name: 'comment-posts', key: 'comments', fn: 'commentPosts' },
  { name: 'watch-live', key: 'live', fn: 'watchLive' },
  { name: 'watch-stories', key: 'stories', fn: 'watchStories' },
  { name: 'browse-marketplace', key: 'marketplace', fn: 'browseMarketplace' },
  { name: 'join-groups', key: 'groups', fn: 'joinGroups' },
  { name: 'add-friends', key: 'friends', fn: 'addFriends' },
  { name: 'follow-pages', key: 'follows', fn: 'followPages' },
  { name: 'share-posts', key: 'shares', fn: 'sharePosts' },
  { name: 'post-story', key: 'postedStory', fn: 'postStory' },
];

const ACTION_MAP = {
  scrollFeed: (page, cursor, logger, intensity) => scrollFeed(page, cursor, logger),
  likePosts: (page, cursor, logger, intensity) => likePosts(page, cursor, logger, intensity),
  reactPosts: (page, cursor, logger, intensity) => reactPosts(page, cursor, logger, intensity),
  commentPosts: (page, cursor, logger, intensity) => commentPosts(page, cursor, logger, intensity),
  watchLive: (page, cursor, logger, intensity) => watchLive(page, cursor, logger),
  watchStories: (page, cursor, logger) => watchStories(page, cursor, logger),
  browseMarketplace: (page, cursor, logger, intensity) => browseMarketplace(page, cursor, logger),
  joinGroups: (page, cursor, logger, intensity) => joinGroups(page, cursor, logger),
  addFriends: (page, cursor, logger, intensity) => addFriends(page, cursor, logger, intensity),
  followPages: (page, cursor, logger, intensity) => followPages(page, cursor, logger, intensity),
  sharePosts: (page, cursor, logger, intensity) => sharePosts(page, cursor, logger, intensity),
  postStory: (page, cursor, logger) => postStory(page, cursor, logger),
};

async function runDay2(page, cursor, logger, profileAlias) {
  const plan = generatePlan(profileAlias, 2, AVAILABLE_ACTIONS);
  logger.setTotalActions(plan.actions.length);

  console.log(`\n  Plano: ${plan.summary}\n`);

  if (plan.isLazyDay) {
    await scrollFeed(page, cursor, logger, plan.actions[0].params?.duration);
    addDayToHistory(profileAlias, {
      day: 2,
      date: new Date().toISOString().split('T')[0],
      startTime: logger.startTime.toLocaleTimeString('pt-BR', { hour12: false }),
      endTime: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
      actionsOrder: ['scroll-feed'],
      actions: { scrollFeed: true },
      errors: [],
      manualPauses: [],
    });
    return;
  }

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

  addDayToHistory(profileAlias, {
    day: 2,
    date: new Date().toISOString().split('T')[0],
    startTime: logger.startTime.toLocaleTimeString('pt-BR', { hour12: false }),
    endTime: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
    actionsOrder: plan.actions.map(a => a.name),
    actions: results,
    errors: logger.entries.filter(e => e.type === 'error'),
    manualPauses: logger.entries.filter(e => e.type === 'manual'),
  });
}

module.exports = { runDay2, AVAILABLE_ACTIONS, ACTION_MAP };
