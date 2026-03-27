const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const { randInt } = require('./human');

const REPORTS_DIR = path.join(__dirname, '..', 'reports');

function getHistory(profile) {
  const filePath = path.join(REPORTS_DIR, `${profile}.json`);
  if (!fs.existsSync(filePath)) return { profile, history: [] };
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function saveHistory(profile, historyData) {
  const filePath = path.join(REPORTS_DIR, `${profile}.json`);
  fs.writeFileSync(filePath, JSON.stringify(historyData, null, 2));
}

function addDayToHistory(profile, dayReport) {
  const data = getHistory(profile);
  data.history.push(dayReport);
  saveHistory(profile, data);
}

function generatePlan(profile, day, availableActions) {
  const history = getHistory(profile);
  const yesterday = history.history[history.history.length - 1];

  // Check if lazy day
  if (Math.random() < config.session.lazyDayChance && day > 2) {
    return {
      isLazyDay: true,
      actions: [{ name: 'scroll-feed', params: { duration: randInt(10, 15) } }],
      summary: 'Dia preguiçoso — só rolar feed'
    };
  }

  const plan = [];
  const marketplaceTotal = history.history.reduce((count, h) => {
    return count + (h.actions?.marketplace ? 1 : 0);
  }, 0);

  for (const action of availableActions) {
    let include = true;
    let intensity = null;

    if (yesterday?.actions) {
      const prev = yesterday.actions[action.key];

      // If done yesterday with high intensity, reduce or skip
      if (prev && prev !== false) {
        if (Math.random() < 0.5) {
          include = false; // skip entirely
        } else {
          intensity = 'low'; // do less
        }
      }
      // If skipped yesterday, higher chance to do today
      if (prev === false && Math.random() < 0.7) {
        include = true;
        intensity = null;
      }
    }

    // Marketplace cap
    if (action.key === 'marketplace' && marketplaceTotal >= config.marketplace.maxTotal) {
      include = false;
    }

    if (include) {
      plan.push({ ...action, intensity });
    }
  }

  // Shuffle order — never same order as yesterday
  for (let i = plan.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [plan[i], plan[j]] = [plan[j], plan[i]];
  }

  // If order matches yesterday, shuffle again
  if (yesterday?.actionsOrder) {
    const currentOrder = plan.map(a => a.name).join(',');
    const prevOrder = yesterday.actionsOrder.join(',');
    if (currentOrder === prevOrder && plan.length > 1) {
      [plan[0], plan[1]] = [plan[1], plan[0]];
    }
  }

  return {
    isLazyDay: false,
    actions: plan,
    summary: `${plan.length} ações: ${plan.map(a => a.name).join(', ')}`
  };
}

module.exports = { getHistory, saveHistory, addDayToHistory, generatePlan };
