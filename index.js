const readline = require('readline');
const { startBrowser, stopBrowser } = require('./src/adspower');
const { getProfile, updateProfile, loadProfiles, saveProfiles } = require('./src/profiles');
const chalk = require('chalk');
const { acquireLock, releaseLock, setupGracefulShutdown } = require('./src/lock');
const { Logger, saveScreenshot } = require('./src/logger');
const { createHumanCursor, askQuestion } = require('./src/human');
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

const DAY_LABELS = {
  0: 'Criar email',
  1: 'Criar perfil (celular)',
  2: 'Aquecimento PC',
  3: '2FA + aquecimento',
  4: 'Criar página + social',
  5: 'BM + aquecimento',
  6: 'Segunda BM',
  7: 'Concluído'
};

// ─── Core: run a day for a profile ───

async function runDay(day, profile) {
  const profileData = getProfile(profile);
  const logger = new Logger(profile, day);

  if (day === 1) {
    await runDay1(null, null, logger, profile);
    return;
  }

  acquireLock(profile);
  let browser;
  try {
    logger.progress('Conectando ao AdsPower...');
    browser = await startBrowser(profileData.adspowerId);
    logger.success('Conectou ao AdsPower');

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    const cursor = createHumanCursor(page);

    setupGracefulShutdown(profile, profileData.adspowerId, logger, null);

    if (day !== 0) {
      logger.progress('Abrindo Facebook...');
      await page.goto('https://www.facebook.com/', { waitUntil: 'networkidle2', timeout: 30000 });
      logger.success('Abriu Facebook');
    }

    const runner = DAY_RUNNERS[day];
    if (!runner) throw new Error(`Dia ${day} não existe (válidos: 0-6)`);
    await runner(page, cursor, logger, profile);

    updateProfile(profile, { currentDay: day + 1 });
    logger.printFooter();
  } catch (e) {
    logger.error(e.message);
    try {
      const pages = await browser?.pages();
      if (pages?.[0]) await saveScreenshot(pages[0], profile, 'crash');
    } catch (_) {}
    logger.printFooter();
  } finally {
    try { await stopBrowser(profileData.adspowerId); } catch (_) {}
    releaseLock(profile);
  }
}

// ─── Flow functions ───

function showStatus() {
  const profiles = loadProfiles();
  const entries = Object.entries(profiles);

  if (entries.length === 0) {
    console.log(chalk.yellow('\n  Nenhum perfil cadastrado.\n'));
    return;
  }

  console.log(chalk.cyan('\n  ┌────────┬──────────────┬─────┬──────────────────────────┐'));
  console.log(chalk.cyan('  │') + chalk.bold(' Perfil ') + chalk.cyan('│') + chalk.bold(' AdsPower ID  ') + chalk.cyan('│') + chalk.bold(' Dia ') + chalk.cyan('│') + chalk.bold(' Próximo passo            ') + chalk.cyan('│'));
  console.log(chalk.cyan('  ├────────┼──────────────┼─────┼──────────────────────────┤'));

  for (const [alias, data] of entries) {
    const day = data.currentDay || 0;
    const status = data.status || 'active';
    const label = day > 6 ? chalk.green('Concluído') : (DAY_LABELS[day] || '?');
    const statusIcon = status !== 'active' ? chalk.red(' [pausado]') : '';
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

async function addProfile() {
  const profiles = loadProfiles();
  const adspowerId = await askQuestion('  ID do perfil no AdsPower: ');

  if (!adspowerId.trim()) {
    console.log(chalk.red('\n  ID não pode ser vazio.\n'));
    return;
  }

  const existingNums = Object.keys(profiles)
    .filter(k => k.match(/^p\d+$/))
    .map(k => parseInt(k.replace('p', '')));
  const nextNum = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;
  const alias = `p${String(nextNum).padStart(3, '0')}`;

  profiles[alias] = {
    adspowerId: adspowerId.trim(),
    email: '',
    emailPassword: '',
    twoFactorSecret: '',
    createdAt: new Date().toISOString().split('T')[0],
    currentDay: 0,
    status: 'active',
    notes: ''
  };

  saveProfiles(profiles);
  console.log(chalk.green(`\n  ${alias} adicionado (AdsPower: ${adspowerId.trim()})\n`));
}

async function runNext() {
  const profiles = loadProfiles();
  const active = Object.entries(profiles)
    .filter(([, p]) => p.status === 'active' && (p.currentDay || 0) <= 6)
    .sort((a, b) => (a[1].currentDay || 0) - (b[1].currentDay || 0));

  if (active.length === 0) {
    console.log(chalk.yellow('\n  Nenhum perfil ativo no pipeline.\n'));
    return;
  }

  const [alias, data] = active[0];
  const day = data.currentDay || 0;

  console.log(chalk.cyan(`\n  Próximo: ${alias} → Dia ${day} (${DAY_LABELS[day]})`));
  console.log(chalk.gray(`  ${active.length} perfil(s) ativo(s)\n`));

  const confirm = await askQuestion('  Rodar agora? (s/n): ');
  if (confirm.toLowerCase() !== 's') {
    console.log(chalk.gray('\n  Cancelado.\n'));
    return;
  }

  await runDay(day, alias);
}

async function manageProfile() {
  const profiles = loadProfiles();
  const entries = Object.entries(profiles);

  if (entries.length === 0) {
    console.log(chalk.yellow('\n  Nenhum perfil cadastrado.\n'));
    return;
  }

  console.log('');
  entries.forEach(([alias, data], i) => {
    const status = data.status || 'active';
    const icon = status === 'active' ? chalk.green('ativo') : chalk.red('pausado');
    console.log(`  ${i + 1}. ${alias} (${data.adspowerId}) — ${icon}`);
  });

  console.log(`\n  a. Pausar/Retomar perfil`);
  console.log(`  b. Remover perfil`);

  const action = await askQuestion('\n  Escolha (a/b): ');

  if (action.trim().toLowerCase() === 'a') {
    const choice = await askQuestion('  Número do perfil: ');
    const idx = parseInt(choice) - 1;

    if (idx < 0 || idx >= entries.length) {
      console.log(chalk.red('\n  Número inválido.\n'));
      return;
    }

    const [alias, data] = entries[idx];
    const newStatus = (data.status || 'active') === 'active' ? 'paused' : 'active';
    updateProfile(alias, { status: newStatus });

    const msg = newStatus === 'active' ? chalk.green('retomado') : chalk.yellow('pausado');
    console.log(`\n  ${alias} ${msg}.\n`);

  } else if (action.trim().toLowerCase() === 'b') {
    const choice = await askQuestion('  Número do perfil para remover: ');
    const idx = parseInt(choice) - 1;

    if (idx < 0 || idx >= entries.length) {
      console.log(chalk.red('\n  Número inválido.\n'));
      return;
    }

    const [alias] = entries[idx];
    const confirm = await askQuestion(`  Tem certeza que quer remover ${alias}? (s/n): `);

    if (confirm.trim().toLowerCase() === 's') {
      delete profiles[alias];
      saveProfiles(profiles);
      console.log(chalk.green(`\n  ${alias} removido.\n`));
    } else {
      console.log(chalk.gray('\n  Cancelado.\n'));
    }
  } else {
    console.log(chalk.red('\n  Opção inválida.\n'));
  }
}

async function runSingleAction() {
  const profiles = loadProfiles();
  const entries = Object.entries(profiles).filter(([, p]) => p.status === 'active');

  if (entries.length === 0) {
    console.log(chalk.yellow('\n  Nenhum perfil ativo.\n'));
    return;
  }

  console.log('\n  Perfis:');
  entries.forEach(([alias], i) => console.log(`  ${i + 1}. ${alias}`));
  const pChoice = await askQuestion('\n  Número do perfil: ');
  const pIdx = parseInt(pChoice) - 1;

  if (pIdx < 0 || pIdx >= entries.length) {
    console.log(chalk.red('\n  Número inválido.\n'));
    return;
  }

  const [alias, profileData] = entries[pIdx];

  const actionNames = ['feed', 'like', 'reels', 'live', 'friends', 'groups', 'marketplace'];
  console.log('\n  Ações:');
  actionNames.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));
  const aChoice = await askQuestion('\n  Número da ação: ');
  const aIdx = parseInt(aChoice) - 1;

  if (aIdx < 0 || aIdx >= actionNames.length) {
    console.log(chalk.red('\n  Número inválido.\n'));
    return;
  }

  const actionName = actionNames[aIdx];
  const logger = new Logger(alias, actionName);

  acquireLock(alias);
  let browser;
  try {
    browser = await startBrowser(profileData.adspowerId);
    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();
    const cursor = createHumanCursor(page);

    setupGracefulShutdown(alias, profileData.adspowerId, logger, null);
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
    await actions[actionName]();
    logger.printFooter();
  } catch (e) {
    logger.error(e.message);
    logger.printFooter();
  } finally {
    try { await stopBrowser(profileData.adspowerId); } catch (_) {}
    releaseLock(alias);
  }
}

// ─── Interactive Menu ───

async function showMenu() {
  console.clear();
  console.log(chalk.cyan.bold('\n  ╔══════════════════════════════════╗'));
  console.log(chalk.cyan.bold('  ║') + chalk.white.bold('       FB Warmer — Menu          ') + chalk.cyan.bold('║'));
  console.log(chalk.cyan.bold('  ╚══════════════════════════════════╝\n'));

  console.log('  1. Rodar próximo perfil');
  console.log('  2. Ver status dos perfis');
  console.log('  3. Adicionar novo perfil');
  console.log('  4. Gerenciar perfil (pausar/remover)');
  console.log('  5. Rodar ação avulsa');
  console.log('  0. Sair\n');

  const choice = await askQuestion('  Escolha: ');

  switch (choice.trim()) {
    case '1':
      await runNext();
      break;
    case '2':
      showStatus();
      break;
    case '3':
      await addProfile();
      break;
    case '4':
      await manageProfile();
      break;
    case '5':
      await runSingleAction();
      break;
    case '0':
      console.log(chalk.gray('\n  Até mais!\n'));
      process.exit(0);
    default:
      console.log(chalk.red('\n  Opção inválida.\n'));
  }

  await askQuestion(chalk.gray('  Pressione ENTER para voltar ao menu...'));
  await showMenu();
}

// Start
showMenu().catch(console.error);
