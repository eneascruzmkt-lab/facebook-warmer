const express = require('express');
const router = express.Router();
const { loadProfiles, saveProfiles, getProfile, updateProfile } = require('./profiles');
const { getHistory } = require('./randomizer');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

// SSE clients
let sseClients = [];

function broadcastSSE(data) {
  sseClients.forEach(res => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

// SSE endpoint
router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  sseClients.push(res);
  req.on('close', () => {
    sseClients = sseClients.filter(c => c !== res);
  });
});

// Profiles CRUD
router.get('/profiles', (req, res) => {
  res.json(loadProfiles());
});

router.post('/profiles', (req, res) => {
  const { adspowerId } = req.body;
  if (!adspowerId) return res.status(400).json({ error: 'adspowerId é obrigatório' });

  const profiles = loadProfiles();
  const existingNums = new Set(
    Object.keys(profiles)
      .filter(k => k.match(/^p\d+$/))
      .map(k => parseInt(k.replace('p', '')))
  );
  let nextNum = 1;
  while (existingNums.has(nextNum)) nextNum++;
  const alias = `p${String(nextNum).padStart(3, '0')}`;

  profiles[alias] = {
    adspowerId,
    email: '',
    emailPassword: '',
    twoFactorSecret: '',
    createdAt: new Date().toISOString().split('T')[0],
    currentDay: 0,
    status: 'active',
    notes: ''
  };

  saveProfiles(profiles);
  broadcastSSE({ type: 'profile-added', alias });
  res.json({ alias, profile: profiles[alias] });
});

router.put('/profiles/:alias', (req, res) => {
  try {
    const profiles = loadProfiles();
    if (!profiles[req.params.alias]) return res.status(404).json({ error: 'Perfil não encontrado' });

    const allowed = ['status', 'currentDay', 'adspowerId', 'notes'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    updateProfile(req.params.alias, updates);
    broadcastSSE({ type: 'profile-updated', alias: req.params.alias, updates });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/profiles/:alias', (req, res) => {
  const profiles = loadProfiles();
  if (!profiles[req.params.alias]) return res.status(404).json({ error: 'Perfil não encontrado' });

  delete profiles[req.params.alias];
  saveProfiles(profiles);
  broadcastSSE({ type: 'profile-deleted', alias: req.params.alias });
  res.json({ ok: true });
});

// Run profile
router.post('/profiles/:alias/run', async (req, res) => {
  try {
    const profile = getProfile(req.params.alias);
    const day = profile.currentDay || 0;

    if (day > 6) return res.status(400).json({ error: 'Perfil já concluiu o processo' });
    if (day === 1) return res.status(400).json({ error: 'Dia 1 é manual (celular)' });

    res.json({ ok: true, message: `Iniciando ${req.params.alias} dia ${day}` });

    // Run in background (don't block the response)
    const { runDayFromAPI } = require('./runner');
    runDayFromAPI(day, req.params.alias, broadcastSSE).catch(err => {
      broadcastSSE({ type: 'error', time: new Date().toLocaleTimeString('pt-BR', { hour12: false }), msg: err.message, profile: req.params.alias });
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Run next
router.post('/run-next', async (req, res) => {
  const profiles = loadProfiles();
  const active = Object.entries(profiles)
    .filter(([, p]) => p.status === 'active' && (p.currentDay || 0) <= 6)
    .sort((a, b) => (a[1].currentDay || 0) - (b[1].currentDay || 0));

  if (active.length === 0) return res.status(400).json({ error: 'Nenhum perfil ativo' });

  const [alias, data] = active[0];
  const day = data.currentDay || 0;

  if (day === 1) return res.status(400).json({ error: `${alias} está no dia 1 (manual/celular)` });

  res.json({ ok: true, message: `Iniciando ${alias} dia ${day}` });

  const { runDayFromAPI } = require('./runner');
  runDayFromAPI(day, alias, broadcastSSE).catch(err => {
    broadcastSSE({ type: 'error', time: new Date().toLocaleTimeString('pt-BR', { hour12: false }), msg: err.message, profile: alias });
  });
});

// Logs
router.get('/logs', (req, res) => {
  const profiles = loadProfiles();
  const allLogs = [];
  const reportsDir = path.join(__dirname, '..', 'reports');

  for (const alias of Object.keys(profiles)) {
    const history = getHistory(alias);
    for (const entry of history.history || []) {
      for (const log of (entry.errors || [])) {
        allLogs.push({ ...log, profile: alias, day: entry.day, date: entry.date });
      }
    }
    // Also read report file for full log entries
    const reportPath = path.join(reportsDir, `${alias}.json`);
    if (fs.existsSync(reportPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
        for (const h of data.history || []) {
          allLogs.push({
            profile: alias,
            day: h.day,
            date: h.date,
            startTime: h.startTime,
            endTime: h.endTime,
            actionsOrder: h.actionsOrder,
            actions: h.actions
          });
        }
      } catch (e) { /* skip bad files */ }
    }
  }

  res.json(allLogs);
});

router.get('/logs/:alias', (req, res) => {
  const history = getHistory(req.params.alias);
  res.json(history);
});

// Config
router.get('/config', (req, res) => {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  res.json(config);
});

router.put('/config', (req, res) => {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(req.body, null, 2));
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Stats
router.get('/stats', (req, res) => {
  const profiles = loadProfiles();
  const entries = Object.entries(profiles);
  const total = entries.length;
  const active = entries.filter(([, p]) => p.status === 'active' && (p.currentDay || 0) <= 6).length;
  const completed = entries.filter(([, p]) => (p.currentDay || 0) > 6).length;
  const paused = entries.filter(([, p]) => p.status === 'paused').length;

  // Count today's actions from reports
  const today = new Date().toISOString().split('T')[0];
  let actionsToday = 0;
  const reportsDir = path.join(__dirname, '..', 'reports');

  for (const alias of Object.keys(profiles)) {
    const reportPath = path.join(reportsDir, `${alias}.json`);
    if (fs.existsSync(reportPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
        for (const h of data.history || []) {
          if (h.date === today && h.actionsOrder) {
            actionsToday += h.actionsOrder.length;
          }
        }
      } catch (e) { /* skip */ }
    }
  }

  // Actions per day of week (last 7 days)
  const weekActions = [0, 0, 0, 0, 0, 0, 0]; // Sun-Sat
  for (const alias of Object.keys(profiles)) {
    const reportPath = path.join(reportsDir, `${alias}.json`);
    if (fs.existsSync(reportPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
        for (const h of data.history || []) {
          if (h.date && h.actionsOrder) {
            const d = new Date(h.date);
            weekActions[d.getDay()] += h.actionsOrder.length;
          }
        }
      } catch (e) { /* skip */ }
    }
  }

  res.json({ total, active, completed, paused, actionsToday, weekActions });
});

module.exports = { router, broadcastSSE };
