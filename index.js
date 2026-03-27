const yargs = require('yargs');
const { startBrowser, stopBrowser } = require('./src/adspower');
const { getProfile, updateProfile } = require('./src/profiles');
const { acquireLock, releaseLock, setupGracefulShutdown } = require('./src/lock');
const { Logger, saveScreenshot } = require('./src/logger');
const { createHumanCursor } = require('./src/human');
const { generatePlan } = require('./src/randomizer');

const { runDay0 } = require('./src/days/day0');
const { runDay1 } = require('./src/days/day1');
const { runDay2 } = require('./src/days/day2');
const { runDay3 } = require('./src/days/day3');
const { runDay4 } = require('./src/days/day4');
const { runDay5 } = require('./src/days/day5');
const { runDay6 } = require('./src/days/day6');

const DAY_RUNNERS = {
  0: runDay0,
  1: runDay1,
  2: runDay2,
  3: runDay3,
  4: runDay4,
  5: runDay5,
  6: runDay6,
};

async function runDay(argv) {
  const { day, profile, dryRun } = argv;
  const profileData = getProfile(profile);
  const logger = new Logger(profile, day);

  // Dry run: show plan and exit
  if (dryRun) {
    if (day === 1) {
      console.log('\n  Dia 1 é manual (celular). Nada para simular.\n');
      return;
    }
    const { AVAILABLE_ACTIONS } = require(`./src/days/day${day}`);
    if (AVAILABLE_ACTIONS) {
      const plan = generatePlan(profile, day, AVAILABLE_ACTIONS);
      console.log(`\n  Plano (dry-run): ${plan.summary}`);
      console.log(`  Lazy day: ${plan.isLazyDay}`);
      console.log(`  Ações: ${plan.actions.map(a => `${a.name}${a.intensity ? ` (${a.intensity})` : ''}`).join(', ')}\n`);
    }
    return;
  }

  // Day 1 is manual only
  if (day === 1) {
    await runDay1(null, null, logger, profile);
    return;
  }

  // Acquire lock
  acquireLock(profile);

  let browser;
  try {
    // Connect to AdsPower
    logger.progress('Conectando ao AdsPower...');
    browser = await startBrowser(profileData.adspowerId);
    logger.success('Conectou ao AdsPower');

    // Get page and cursor
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    const cursor = createHumanCursor(page);

    // Setup graceful shutdown
    const saveReport = () => {
      const report = logger.getReport();
      // Report is saved via addDayToHistory in each day runner
    };
    setupGracefulShutdown(profile, profileData.adspowerId, logger, saveReport);

    // Navigate to Facebook (skip for day 0 — email creation goes to Outlook)
    if (day !== 0) {
      logger.progress('Abrindo Facebook...');
      await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2', timeout: 30000 });
      logger.success('Abriu Facebook');
    }

    // Run day
    const runner = DAY_RUNNERS[day];
    if (!runner) throw new Error(`Dia ${day} não existe (válidos: 0-6)`);
    await runner(page, cursor, logger, profile);

    // Update current day
    updateProfile(profile, { currentDay: day + 1 });

    // Print footer
    logger.printFooter();
  } catch (e) {
    logger.error(e.message);
    try {
      const pages = await browser?.pages();
      if (pages?.[0]) await saveScreenshot(pages[0], profile, 'crash');
    } catch (_) {}
    logger.printFooter();
  } finally {
    // Stop browser and release lock
    try {
      await stopBrowser(profileData.adspowerId);
    } catch (_) {}
    releaseLock(profile);
  }
}

// Single action runners
async function runSingleAction(actionName, argv) {
  const { profile } = argv;
  const profileData = getProfile(profile);
  const logger = new Logger(profile, actionName);

  acquireLock(profile);
  let browser;

  try {
    browser = await startBrowser(profileData.adspowerId);
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    const cursor = createHumanCursor(page);

    setupGracefulShutdown(profile, profileData.adspowerId, logger, null);

    await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2', timeout: 30000 });

    const actions = {
      like: () => require('./src/actions/like-posts').likePosts(page, cursor, logger),
      reels: () => require('./src/actions/watch-reels').watchReels(page, cursor, logger),
      live: () => require('./src/actions/watch-live').watchLive(page, cursor, logger),
      friends: () => require('./src/actions/add-friends').addFriends(page, cursor, logger),
      groups: () => require('./src/actions/join-groups').joinGroups(page, cursor, logger),
      marketplace: () => require('./src/actions/browse-marketplace').browseMarketplace(page, cursor, logger),
      feed: () => require('./src/actions/scroll-feed').scrollFeed(page, cursor, logger),
    };

    logger.setTotalActions(1);
    if (!actions[actionName]) throw new Error(`Ação "${actionName}" não existe`);
    await actions[actionName]();
    logger.printFooter();
  } catch (e) {
    logger.error(e.message);
    logger.printFooter();
  } finally {
    try { await stopBrowser(profileData.adspowerId); } catch (_) {}
    releaseLock(profile);
  }
}

yargs
  .command('$0', 'Run warming for a profile day', (y) => {
    y.option('day', { type: 'number', describe: 'Day number (0-6)', demandOption: true });
    y.option('profile', { type: 'string', describe: 'Profile alias', demandOption: true });
    y.option('dry-run', { type: 'boolean', describe: 'Show plan without executing', default: false });
  }, runDay)
  .command('like', 'Run only like action', (y) => {
    y.option('profile', { type: 'string', demandOption: true });
  }, (argv) => runSingleAction('like', argv))
  .command('reels', 'Run only reels action', (y) => {
    y.option('profile', { type: 'string', demandOption: true });
  }, (argv) => runSingleAction('reels', argv))
  .command('live', 'Run only live action', (y) => {
    y.option('profile', { type: 'string', demandOption: true });
  }, (argv) => runSingleAction('live', argv))
  .command('friends', 'Run only add-friends action', (y) => {
    y.option('profile', { type: 'string', demandOption: true });
  }, (argv) => runSingleAction('friends', argv))
  .command('groups', 'Run only join-groups action', (y) => {
    y.option('profile', { type: 'string', demandOption: true });
  }, (argv) => runSingleAction('groups', argv))
  .command('marketplace', 'Run only marketplace action', (y) => {
    y.option('profile', { type: 'string', demandOption: true });
  }, (argv) => runSingleAction('marketplace', argv))
  .command('feed', 'Run only scroll-feed action', (y) => {
    y.option('profile', { type: 'string', demandOption: true });
  }, (argv) => runSingleAction('feed', argv))
  .help()
  .argv;
