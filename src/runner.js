const { startBrowser, stopBrowser } = require('./adspower');
const { getProfile, updateProfile } = require('./profiles');
const { acquireLock, releaseLock, setupGracefulShutdown } = require('./lock');
const { Logger, saveScreenshot } = require('./logger');
const { createHumanCursor } = require('./human');
const { notifyStart, notifyComplete, notifyError, notifyManual } = require('./telegram');

const { runDay0 } = require('./days/day0');
const { runDay1 } = require('./days/day1');
const { runDay2 } = require('./days/day2');
const { runDay3 } = require('./days/day3');
const { runDay4 } = require('./days/day4');
const { runDay5 } = require('./days/day5');
const { runDay6 } = require('./days/day6');

const DAY_RUNNERS = {
  0: runDay0, 1: runDay1, 2: runDay2, 3: runDay3,
  4: runDay4, 5: runDay5, 6: runDay6,
};

async function runDayFromAPI(day, profileAlias, broadcastFn) {
  const profileData = getProfile(profileAlias);
  const logger = new Logger(profileAlias, day);

  // Hook logger to broadcast SSE events
  const originalSuccess = logger.success.bind(logger);
  const originalProgress = logger.progress.bind(logger);
  const originalError = logger.error.bind(logger);
  const originalManual = logger.manual.bind(logger);
  const originalSkip = logger.skip.bind(logger);

  logger.success = (msg) => {
    originalSuccess(msg);
    if (broadcastFn) broadcastFn({ type: 'success', time: logger._timestamp(), msg, profile: profileAlias });
  };
  logger.progress = (msg) => {
    originalProgress(msg);
    if (broadcastFn) broadcastFn({ type: 'progress', time: logger._timestamp(), msg, profile: profileAlias });
  };
  logger.error = (msg) => {
    originalError(msg);
    if (broadcastFn) broadcastFn({ type: 'error', time: logger._timestamp(), msg, profile: profileAlias });
    notifyError(profileAlias, msg);
  };
  logger.manual = (msg) => {
    originalManual(msg);
    if (broadcastFn) broadcastFn({ type: 'manual', time: logger._timestamp(), msg, profile: profileAlias });
    notifyManual(profileAlias, msg);
  };
  logger.skip = (msg) => {
    originalSkip(msg);
    if (broadcastFn) broadcastFn({ type: 'skip', time: logger._timestamp(), msg, profile: profileAlias });
  };

  if (day === 1) {
    await runDay1(null, null, logger, profileAlias);
    return;
  }

  notifyStart(profileAlias, day);

  acquireLock(profileAlias);
  let browser;
  try {
    logger.progress('Conectando ao AdsPower...');
    browser = await startBrowser(profileData.adspowerId);
    logger.success('Conectou ao AdsPower');

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    const cursor = createHumanCursor(page);

    setupGracefulShutdown(profileAlias, profileData.adspowerId, logger, null);

    if (day !== 0) {
      logger.progress('Abrindo Facebook...');
      await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2', timeout: 30000 });
      logger.success('Abriu Facebook');
    }

    const runner = DAY_RUNNERS[day];
    if (!runner) throw new Error(`Dia ${day} não existe`);
    await runner(page, cursor, logger, profileAlias);

    updateProfile(profileAlias, { currentDay: day + 1 });
    logger.printFooter();

    if (broadcastFn) broadcastFn({ type: 'completed', profile: profileAlias, day });
    notifyComplete(profileAlias, day);
  } catch (e) {
    logger.error(e.message);
    try {
      const pages = await browser?.pages();
      if (pages?.[0]) await saveScreenshot(pages[0], profileAlias, 'crash');
    } catch (_) {}
    logger.printFooter();
  } finally {
    try { await stopBrowser(profileData.adspowerId); } catch (_) {}
    releaseLock(profileAlias);
  }
}

module.exports = { runDayFromAPI };
