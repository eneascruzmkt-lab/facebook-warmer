const yargs = require('yargs');
const { startBrowser, stopBrowser } = require('./src/adspower');
const { getProfile, updateProfile, loadProfiles, saveProfiles } = require('./src/profiles');
const chalk = require('chalk');
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

// Flow: pipeline management
async function runFlow(argv) {
  const profiles = loadProfiles();
  const active = Object.entries(profiles)
    .filter(([, p]) => p.status === 'active' && p.currentDay <= 6)
    .sort((a, b) => a[1].currentDay - b[1].currentDay);

  if (active.length === 0) {
    console.log(chalk.yellow('\n  Nenhum perfil ativo no pipeline.\n'));
    console.log(chalk.gray('  Use: node index.js flow --add --adspower-id <ID>\n'));
    return;
  }

  // Pick the profile with the lowest currentDay (most behind)
  const [alias, data] = active[0];
  const day = data.currentDay;

  if (day > 6) {
    console.log(chalk.green(`\n  Todos os perfis completaram o processo!\n`));
    return;
  }

  console.log(chalk.cyan(`\n  Pipeline: ${alias} → Dia ${day}`));
  console.log(chalk.gray(`  (${active.length} perfis ativos)\n`));

  await runDay({ day, profile: alias, dryRun: false });
}

async function flowAdd(argv) {
  const profiles = loadProfiles();
  const adspowerId = argv.adspowerId;

  if (!adspowerId) {
    console.log(chalk.red('  Erro: --adspower-id é obrigatório'));
    return;
  }

  // Auto-generate alias: p001, p002, etc
  const existingNums = Object.keys(profiles)
    .filter(k => k.match(/^p\d+$/))
    .map(k => parseInt(k.replace('p', '')));
  const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
  const alias = `p${String(nextNum).padStart(3, '0')}`;

  profiles[alias] = {
    adspowerId: adspowerId,
    email: '',
    emailPassword: '',
    twoFactorSecret: '',
    createdAt: new Date().toISOString().split('T')[0],
    currentDay: 0,
    status: 'active',
    notes: ''
  };

  saveProfiles(profiles);
  console.log(chalk.green(`\n  Perfil ${alias} adicionado (AdsPower: ${adspowerId})`));
  console.log(chalk.gray(`  Próximo passo: node index.js flow\n`));
}

function flowStatus() {
  const profiles = loadProfiles();
  const entries = Object.entries(profiles);

  if (entries.length === 0) {
    console.log(chalk.yellow('\n  Nenhum perfil cadastrado.\n'));
    return;
  }

  const dayLabels = {
    0: 'Criar email',
    1: 'Criar perfil (celular)',
    2: 'Aquecimento PC',
    3: '2FA + aquecimento',
    4: 'Criar página + social',
    5: 'BM + aquecimento',
    6: 'Segunda BM',
    7: 'Concluído'
  };

  console.log(chalk.cyan('\n  ┌────────┬──────────────┬─────┬──────────────────────────┐'));
  console.log(chalk.cyan('  │') + chalk.bold(' Perfil ') + chalk.cyan('│') + chalk.bold(' AdsPower ID  ') + chalk.cyan('│') + chalk.bold(' Dia ') + chalk.cyan('│') + chalk.bold(' Próximo passo            ') + chalk.cyan('│'));
  console.log(chalk.cyan('  ├────────┼──────────────┼─────┼──────────────────────────┤'));

  for (const [alias, data] of entries) {
    const day = data.currentDay || 0;
    const status = data.status || 'active';
    const label = day > 6 ? chalk.green('Concluído') : (dayLabels[day] || '?');
    const statusIcon = status === 'active' ? '' : chalk.red(' [pausado]');
    const dayStr = day > 6 ? chalk.green(' ✓  ') : ` ${day}   `;

    console.log(
      chalk.cyan('  │') +
      ` ${alias}  `.padEnd(8) +
      chalk.cyan('│') +
      ` ${data.adspowerId}`.padEnd(14) +
      chalk.cyan('│') +
      dayStr +
      chalk.cyan('│') +
      ` ${label}${statusIcon}`.padEnd(26) +
      chalk.cyan('│')
    );
  }

  console.log(chalk.cyan('  └────────┴──────────────┴─────┴──────────────────────────┘\n'));
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
  .command('flow', 'Pipeline: roda o próximo perfil automaticamente', (y) => {
    y.option('add', { type: 'boolean', describe: 'Adicionar novo perfil ao pipeline', default: false });
    y.option('status', { type: 'boolean', describe: 'Ver status de todos os perfis', default: false });
    y.option('adspower-id', { type: 'string', describe: 'ID do perfil no AdsPower (usado com --add)' });
    y.option('pause', { type: 'string', describe: 'Pausar um perfil (alias)' });
    y.option('resume', { type: 'string', describe: 'Retomar um perfil (alias)' });
  }, async (argv) => {
    if (argv.status) {
      flowStatus();
    } else if (argv.add) {
      await flowAdd(argv);
    } else if (argv.pause) {
      updateProfile(argv.pause, { status: 'paused' });
      console.log(chalk.yellow(`\n  Perfil ${argv.pause} pausado.\n`));
    } else if (argv.resume) {
      updateProfile(argv.resume, { status: 'active' });
      console.log(chalk.green(`\n  Perfil ${argv.resume} retomado.\n`));
    } else {
      await runFlow(argv);
    }
  })
  .help()
  .argv;
