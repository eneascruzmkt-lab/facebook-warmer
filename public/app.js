'use strict';

/* ─── SVG Icons ────────────────────────────────────────────── */
const ICONS = {
  dashboard: '<svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><rect x="2" y="2" width="7" height="7" rx="1.5"/><rect x="11" y="2" width="7" height="7" rx="1.5"/><rect x="2" y="11" width="7" height="7" rx="1.5"/><rect x="11" y="11" width="7" height="7" rx="1.5"/></svg>',
  profiles: '<svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><circle cx="10" cy="6" r="4"/><path d="M2 17c0-3.3 3.6-6 8-6s8 2.7 8 6"/></svg>',
  logs: '<svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><path d="M4 4h12v1H4zM4 8h10v1H4zM4 12h12v1H4zM4 16h8v1H4z"/></svg>',
  config: '<svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20"><circle cx="10" cy="10" r="3" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 1v3M10 16v3M1 10h3M16 10h3M3.5 3.5l2 2M14.5 14.5l2 2M3.5 16.5l2-2M14.5 5.5l2-2" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>',
  play: '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M6 4l10 6-10 6z"/></svg>',
  pause: '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><rect x="5" y="3" width="3" height="14" rx="1"/><rect x="12" y="3" width="3" height="14" rx="1"/></svg>',
  trash: '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M7 3V2h6v1h4v2H3V3h4zM4 7h12l-1 11H5L4 7z"/></svg>',
  edit: '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M13.5 3.5l3 3L7 16H4v-3l9.5-9.5z"/></svg>',
  plus: '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M10 3v14M3 10h14" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
  close: '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
  check: '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M4 10l4 4 8-8" stroke="currentColor" stroke-width="2" fill="none"/></svg>',
  warning: '<svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16"><path d="M10 2L1 18h18L10 2z" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="10" y1="8" x2="10" y2="13" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="15.5" r="0.8"/></svg>',
  spinner: '<svg viewBox="0 0 20 20" width="16" height="16" class="spin"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="30 14" stroke-linecap="round"/></svg>',
};

/* ─── Globals ───────────────────────────────────────────────── */
const API = '';  // same origin

const DAY_LABELS = {
  0: 'Criar email',
  1: 'Criar perfil (celular)',
  2: 'Aquecimento PC',
  3: '2FA + aquecimento',
  4: 'Criar pagina + social',
  5: 'BM + aquecimento',
  6: 'Segunda BM',
  7: 'Concluido'
};

let allLogs = [];
let sseSource = null;
let runningProfiles = new Set();

// Modal state
let dayModalAlias = null;
let dayModalSelected = null;
let deleteAlias = null;

/* ═══════════════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════════════ */

function switchPage(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navBtn) navBtn.classList.add('active');

  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'profiles':  loadProfiles();  break;
    case 'logs':      loadLogs();      break;
    case 'config':    loadConfig();    break;
  }
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD
═══════════════════════════════════════════════════════════════ */

async function loadDashboard() {
  try {
    const [statsRes, profilesRes] = await Promise.all([
      fetch(`${API}/api/stats`),
      fetch(`${API}/api/profiles`)
    ]);

    const stats    = statsRes.ok    ? await statsRes.json()    : {};
    const profiles = profilesRes.ok ? await profilesRes.json() : {};

    renderStatCards(stats, profiles);
    renderProgressBars(profiles);
    renderActionsChart(stats);
  } catch (err) {
    console.error('loadDashboard error:', err);
    renderStatCards({}, {});
    renderProgressBars({});
    renderActionsChart({});
  }
}

function renderStatCards(stats, profiles) {
  const entries  = Object.entries(profiles || {});
  const total    = entries.length;
  const active   = entries.filter(([, d]) => (d.status || 'active') === 'active').length;
  const done     = entries.filter(([, d]) => (d.currentDay || 0) > 6).length;
  const actToday = stats.actionsToday ?? stats.actions_today ?? 0;

  const cards = [
    { label: 'Total de Perfis',    number: total,    color: '#3b82f6' },
    { label: 'Perfis Ativos',      number: active,   color: '#22c55e' },
    { label: 'Concluidos',         number: done,     color: '#8b5cf6' },
    { label: 'Acoes Hoje',         number: actToday, color: '#f59e0b' },
  ];

  const grid = document.getElementById('stats-cards');
  if (!grid) return;
  grid.innerHTML = cards.map(c => `
    <div class="stat-card" style="--stat-color:${c.color}">
      <div class="stat-number">${c.number}</div>
      <div class="stat-label">${c.label}</div>
    </div>
  `).join('');
}

function renderProgressBars(profiles) {
  const container = document.getElementById('progress-bars');
  if (!container) return;

  const entries = Object.entries(profiles || {});
  if (!entries.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.profiles}</div>Nenhum perfil cadastrado</div>`;
    return;
  }

  container.innerHTML = entries.map(([alias, data]) => renderProgress(alias, data)).join('');
}

function renderProgress(alias, data) {
  const day   = data.currentDay || 0;
  const pct   = Math.min(Math.round((day / 6) * 100), 100);
  const color = day > 6 ? '#8b5cf6' : (pct > 60 ? '#22c55e' : '#3b82f6');
  return `<div class="progress-item">
    <div class="progress-label">
      <span>${alias}</span>
      <span style="color:${color}">${day > 6 ? 'Concluido' : `Dia ${day}/6`}</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width:${pct}%;background:linear-gradient(90deg,#3b82f6,${color})"></div>
    </div>
  </div>`;
}

function renderActionsChart(stats) {
  const container = document.getElementById('actions-chart');
  if (!container) return;

  const byDay = stats.actionsByDay || stats.actions_by_day || {};
  const labels = Object.keys(DAY_LABELS).map(Number).filter(k => k <= 6);

  if (!Object.keys(byDay).length) {
    container.innerHTML = `<div class="empty-state" style="height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column"><div class="empty-state-icon">${ICONS.logs}</div>Sem dados ainda</div>`;
    return;
  }

  const values = labels.map(k => byDay[k] || 0);
  const maxVal = Math.max(...values, 1);

  container.innerHTML = labels.map((k, i) => {
    const pct   = Math.round((values[i] / maxVal) * 100);
    const short = DAY_LABELS[k].split(' ').slice(0, 2).join(' ');
    return `<div class="chart-bar-wrap">
      <div class="chart-value">${values[i] || ''}</div>
      <div class="chart-bar" style="height:${pct}%" title="${DAY_LABELS[k]}: ${values[i]} acoes"></div>
      <div class="chart-label">${short}</div>
    </div>`;
  }).join('');
}

/* ─── SSE Live Log ──────────────────────────────────────────── */

function connectSSE() {
  if (sseSource) sseSource.close();

  try {
    sseSource = new EventSource(`${API}/api/events`);

    sseSource.onmessage = (event) => {
      let entry;
      try { entry = JSON.parse(event.data); } catch { return; }

      if (entry.type === 'completed' || entry.type === 'error') {
        if (entry.profile && runningProfiles.has(entry.profile)) {
          runningProfiles.delete(entry.profile);
          loadProfiles();
          loadDashboard();
        }
      }

      const liveLog = document.getElementById('live-log');
      if (!liveLog) return;

      const displayEntry = { ...entry };
      if (entry.profile) {
        displayEntry.msg = `[${entry.profile}] ${entry.msg || ''}`;
      }

      const div = document.createElement('div');
      div.innerHTML = renderLogEntry(displayEntry);
      liveLog.appendChild(div.firstElementChild);

      while (liveLog.children.length > 100) {
        liveLog.removeChild(liveLog.firstChild);
      }

      liveLog.scrollTop = liveLog.scrollHeight;
    };

    sseSource.onerror = () => {
      sseSource.close();
      setTimeout(connectSSE, 5000);
    };
  } catch (err) {
    console.warn('SSE not available:', err);
  }
}

/* ═══════════════════════════════════════════════════════════════
   PROFILES
═══════════════════════════════════════════════════════════════ */

async function loadProfiles() {
  try {
    const res      = await fetch(`${API}/api/profiles`);
    const profiles = res.ok ? await res.json() : {};
    renderProfilesTable(profiles);
  } catch (err) {
    console.error('loadProfiles error:', err);
    renderProfilesTable({});
  }
}

function renderProfilesTable(profiles) {
  const grid = document.getElementById('profiles-grid');
  if (!grid) return;

  const entries = Object.entries(profiles || {});
  if (!entries.length) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.profiles}</div>Nenhum perfil cadastrado ainda.<br>Clique em "Novo Perfil" para comecar.</div>`;
    return;
  }

  grid.innerHTML = entries.map(([alias, data]) => renderProfileCard(alias, data)).join('');
}

function renderProfileCard(alias, data) {
  const day = data.currentDay || 0;
  const status = data.status || 'active';
  const label = DAY_LABELS[day] || '?';
  const isComplete = day > 6;
  const isRunning = runningProfiles.has(alias);

  // Status badge
  let statusBadge;
  if (isRunning) {
    statusBadge = `<span class="badge badge-running">${ICONS.spinner} Processando...</span>`;
  } else if (isComplete) {
    statusBadge = `<span class="badge badge-done">${ICONS.check} Concluido</span>`;
  } else if (status === 'active') {
    statusBadge = '<span class="badge badge-active">Ativo</span>';
  } else {
    statusBadge = '<span class="badge badge-paused">Pausado</span>';
  }

  const disabledAttr = isRunning ? 'disabled' : '';
  const cardClass = isRunning ? 'profile-card running' : 'profile-card';

  // Progress dots
  let dotsHtml = '';
  for (let i = 0; i <= 6; i++) {
    let cls = 'profile-dot';
    if (isComplete) {
      cls += ' completed';
    } else if (i < day) {
      cls += ' filled';
    } else if (i === day) {
      cls += ' current';
    }
    dotsHtml += `<div class="${cls}" title="Dia ${i}: ${DAY_LABELS[i]}"></div>`;
  }

  // Action buttons with SVG icons
  let runBtn = '';
  if (isRunning) {
    runBtn = `<button class="btn btn-sm btn-primary" disabled>${ICONS.spinner} Rodando Dia ${day}...</button>`;
  } else if (!isComplete) {
    runBtn = `<button class="btn btn-sm btn-primary" onclick="runProfile('${alias}')" title="Executar dia ${day}">${ICONS.play} Rodar</button>`;
  }

  const toggleLabel = status === 'active' ? 'Pausar' : 'Retomar';
  const toggleIcon = status === 'active' ? ICONS.pause : ICONS.play;

  return `<div class="${cardClass}">
    <div class="profile-card-header">
      <span class="profile-card-name">${alias}</span>
      <span class="profile-card-id">${data.adspowerId || ''}</span>
    </div>
    <div class="profile-card-info">
      <div class="profile-card-row">
        <span class="profile-card-label">Status</span>
        ${statusBadge}
      </div>
      <div class="profile-card-row">
        <span class="profile-card-label">Etapa Atual</span>
        <span class="profile-card-value">${isComplete ? 'Concluido' : `Dia ${day} - ${label}`}</span>
      </div>
    </div>
    <div class="profile-card-dots">${dotsHtml}</div>
    <div class="profile-card-actions">
      ${runBtn}
      <button class="btn btn-sm btn-ghost" onclick="toggleProfile('${alias}')" ${disabledAttr} title="${toggleLabel}">${toggleIcon} ${toggleLabel}</button>
      <button class="btn btn-sm btn-ghost" onclick="changeDay('${alias}', ${day})" ${disabledAttr} title="Alterar etapa">${ICONS.edit} Etapa</button>
      <button class="btn btn-sm btn-danger" onclick="deleteProfile('${alias}')" ${disabledAttr} title="Remover perfil">${ICONS.trash}</button>
    </div>
  </div>`;
}

async function addProfile() {
  const input = document.getElementById('new-adspower-id');
  const adspowerId = input ? input.value.trim() : '';

  if (!adspowerId) {
    alert('Informe o ID do AdsPower.');
    return;
  }

  try {
    const res = await fetch(`${API}/api/profiles`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ adspowerId })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert('Erro ao adicionar: ' + (err.error || res.statusText));
      return;
    }

    hideAddModal();
    if (input) input.value = '';
    loadProfiles();
  } catch (err) {
    alert('Erro de conexao: ' + err.message);
  }
}

function showAddModal() {
  const modal = document.getElementById('add-modal');
  if (modal) modal.style.display = 'flex';
  const input = document.getElementById('new-adspower-id');
  if (input) setTimeout(() => input.focus(), 50);
}

function hideAddModal() {
  const modal = document.getElementById('add-modal');
  if (modal) modal.style.display = 'none';
}

async function toggleProfile(alias) {
  try {
    const profilesRes = await fetch(`${API}/api/profiles`);
    const profiles = await profilesRes.json();
    const current = profiles[alias];
    if (!current) return;

    const newStatus = (current.status || 'active') === 'active' ? 'paused' : 'active';

    const res = await fetch(`${API}/api/profiles/${encodeURIComponent(alias)}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ status: newStatus })
    });
    if (!res.ok) throw new Error(res.statusText);
    loadProfiles();
    loadDashboard();
  } catch (err) {
    alert('Erro ao alternar status: ' + err.message);
  }
}

/* ─── Day Change Modal ──────────────────────────────────────── */

function changeDay(alias, currentDay) {
  dayModalAlias = alias;
  dayModalSelected = currentDay;

  const stepper = document.getElementById('day-stepper');
  stepper.innerHTML = '';

  for (let d = 0; d <= 6; d++) {
    const isCurrent = d === currentDay;
    const isSelected = d === dayModalSelected;
    const step = document.createElement('div');
    step.className = `step ${isCurrent ? 'step-current' : ''} ${isSelected ? 'step-selected' : ''}`;
    step.dataset.day = d;
    step.onclick = () => selectDay(d);
    step.innerHTML = `
      <div class="step-circle">${d}</div>
      <div class="step-label">${DAY_LABELS[d]}</div>
      ${isCurrent ? '<div class="step-tag">atual</div>' : ''}
    `;
    stepper.appendChild(step);
  }

  document.getElementById('day-modal').style.display = 'flex';
}

function selectDay(d) {
  dayModalSelected = d;
  document.querySelectorAll('.step').forEach(s => {
    s.classList.toggle('step-selected', parseInt(s.dataset.day) === d);
  });
}

function hideDayModal() {
  document.getElementById('day-modal').style.display = 'none';
  dayModalAlias = null;
  dayModalSelected = null;
}

async function confirmDayChange() {
  if (dayModalAlias === null || dayModalSelected === null) return;

  const day = dayModalSelected;
  if (day < 0 || day > 6) {
    alert('Dia invalido.');
    return;
  }

  try {
    const res = await fetch(`${API}/api/profiles/${encodeURIComponent(dayModalAlias)}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ currentDay: day })
    });
    if (!res.ok) throw new Error(res.statusText);
    hideDayModal();
    loadProfiles();
    loadDashboard();
  } catch (err) {
    alert('Erro ao alterar dia: ' + err.message);
  }
}

/* ─── Delete Confirmation Modal ─────────────────────────────── */

function deleteProfile(alias) {
  deleteAlias = alias;
  document.getElementById('delete-profile-name').textContent = alias;
  document.getElementById('delete-modal').style.display = 'flex';
}

function hideDeleteModal() {
  document.getElementById('delete-modal').style.display = 'none';
  deleteAlias = null;
}

async function confirmDelete() {
  if (!deleteAlias) return;
  try {
    const res = await fetch(`${API}/api/profiles/${encodeURIComponent(deleteAlias)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(res.statusText);
    hideDeleteModal();
    loadProfiles();
    loadDashboard();
  } catch (err) {
    alert('Erro ao remover: ' + err.message);
  }
}

/* ─── Run Profile ───────────────────────────────────────────── */

async function runProfile(alias) {
  if (runningProfiles.has(alias)) return;

  try {
    const res = await fetch(`${API}/api/profiles/${encodeURIComponent(alias)}/run`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert('Erro: ' + (err.error || res.statusText));
      return;
    }
    runningProfiles.add(alias);
    loadProfiles();
  } catch (err) {
    alert('Erro ao rodar perfil: ' + err.message);
  }
}

async function runNextProfile() {
  try {
    const res = await fetch(`${API}/api/run-next`, { method: 'POST' });
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    console.log('runNext result:', data);
    loadProfiles();
  } catch (err) {
    alert('Erro ao rodar proximo perfil: ' + err.message);
  }
}

/* ═══════════════════════════════════════════════════════════════
   LOGS
═══════════════════════════════════════════════════════════════ */

async function loadLogs() {
  try {
    const res = await fetch(`${API}/api/logs`);
    allLogs   = res.ok ? await res.json() : [];
    if (!Array.isArray(allLogs)) allLogs = [];
    populateProfileFilter(allLogs);
    renderLogs(allLogs);
  } catch (err) {
    console.error('loadLogs error:', err);
    allLogs = [];
    renderLogs([]);
  }
}

function populateProfileFilter(logs) {
  const select = document.getElementById('filter-profile');
  if (!select) return;

  const profiles = [...new Set(logs.map(l => l.profile || l.alias).filter(Boolean))];
  const current  = select.value;

  select.innerHTML = '<option value="">Todos os perfis</option>' +
    profiles.map(p => `<option value="${p}"${p === current ? ' selected' : ''}>${p}</option>`).join('');
}

function renderLogs(logs) {
  const container = document.getElementById('log-entries');
  if (!container) return;

  if (!logs.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">${ICONS.logs}</div>Nenhum log encontrado</div>`;
    return;
  }

  container.innerHTML = [...logs].reverse().map(renderLogEntry).join('');
}

function renderLogEntry(entry) {
  const iconMap = {
    success:  ICONS.check,
    error:    ICONS.close,
    progress: ICONS.play,
    manual:   ICONS.warning,
    skip:     ICONS.pause,
  };
  const colorMap = {
    success:  '#22c55e',
    error:    '#ef4444',
    progress: '#3b82f6',
    manual:   '#f59e0b',
    skip:     '#555570',
  };
  const icon  = iconMap[entry.type]  || ICONS.logs;
  const color = colorMap[entry.type] || '#555570';
  const time  = entry.time || entry.timestamp || '';
  const msg   = entry.msg  || entry.message   || '';
  const type  = entry.type || '';
  return `<div class="log-entry" data-type="${type}">
    <span class="log-time">${time}</span>
    <span class="log-icon" style="color:${color}">${icon}</span>
    <span class="log-msg">${escapeHtml(msg)}</span>
  </div>`;
}

function applyLogFilters() {
  const profileVal = (document.getElementById('filter-profile')?.value || '').trim();
  const typeVal    = (document.getElementById('filter-type')?.value    || '').trim();

  const filtered = allLogs.filter(l => {
    const matchProfile = !profileVal || (l.profile || l.alias) === profileVal;
    const matchType    = !typeVal    || l.type === typeVal;
    return matchProfile && matchType;
  });

  renderLogs(filtered);
}

/* ═══════════════════════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════════════════════ */

async function loadConfig() {
  try {
    const res    = await fetch(`${API}/api/config`);
    const config = res.ok ? await res.json() : {};
    renderTemplates(config);
    renderConfigForm(config);
  } catch (err) {
    console.error('loadConfig error:', err);
    renderTemplates({});
    renderConfigForm({});
  }
}

/* ─── Config Templates ─────────────────────────────────────── */

const CONFIG_TEMPLATES = [
  {
    name: 'Conservador',
    desc: 'Poucas acoes, lento e seguro. Ideal para perfis novos ou apos bloqueio. Menor risco de deteccao.',
    color: '#22c55e',
    config: {
      likes: { min: 2, max: 5 },
      friends: { max: 2 },
      groups: { min: 0, max: 1 },
      follows: { max: 1 },
      reels: { durationMin: 10, durationMax: 15 },
      live: { duration: 120 },
      marketplace: { maxTotal: 1 },
      session: {
        lazyDayChance: 0.35,
        startTimeVarianceMin: 90,
        delayBetweenActions: { min: 60, max: 420 },
        longPause: { min: 600, max: 1200 },
        longPauseChance: 0.4
      },
      mouse: { clickDelay: { min: 150, max: 500 } },
      retry: { elementNotFound: 2, adspowerReconnect: 3, pageLoad: 2 }
    }
  },
  {
    name: 'Equilibrado',
    desc: 'Balanco entre seguranca e velocidade. Comportamento natural de um usuario comum. Recomendado para a maioria.',
    color: '#3b82f6',
    config: {
      likes: { min: 5, max: 10 },
      friends: { max: 5 },
      groups: { min: 1, max: 2 },
      follows: { max: 3 },
      reels: { durationMin: 15, durationMax: 25 },
      live: { duration: 120 },
      marketplace: { maxTotal: 2 },
      session: {
        lazyDayChance: 0.2,
        startTimeVarianceMin: 60,
        delayBetweenActions: { min: 30, max: 300 },
        longPause: { min: 300, max: 900 },
        longPauseChance: 0.3
      },
      mouse: { clickDelay: { min: 100, max: 400 } },
      retry: { elementNotFound: 2, adspowerReconnect: 3, pageLoad: 2 }
    }
  },
  {
    name: 'Agressivo',
    desc: 'Mais acoes por sessao, tempos menores entre elas. Para perfis ja aquecidos que precisam de volume. Maior risco.',
    color: '#f59e0b',
    config: {
      likes: { min: 8, max: 15 },
      friends: { max: 8 },
      groups: { min: 1, max: 3 },
      follows: { max: 5 },
      reels: { durationMin: 20, durationMax: 35 },
      live: { duration: 60 },
      marketplace: { maxTotal: 3 },
      session: {
        lazyDayChance: 0.1,
        startTimeVarianceMin: 30,
        delayBetweenActions: { min: 15, max: 180 },
        longPause: { min: 120, max: 480 },
        longPauseChance: 0.15
      },
      mouse: { clickDelay: { min: 80, max: 300 } },
      retry: { elementNotFound: 3, adspowerReconnect: 3, pageLoad: 3 }
    }
  }
];

function renderTemplates(currentConfig) {
  const grid = document.getElementById('templates-grid');
  if (!grid) return;

  grid.innerHTML = CONFIG_TEMPLATES.map((tpl, i) => `
    <div class="template-card" onclick="applyTemplate(${i})" style="--tpl-color:${tpl.color}">
      <div class="template-header">
        <div class="template-dot" style="background:${tpl.color}"></div>
        <span class="template-name">${tpl.name}</span>
      </div>
      <p class="template-desc">${tpl.desc}</p>
      <div class="template-preview">
        <div class="template-stat"><span>Curtidas</span><span>${tpl.config.likes.min}-${tpl.config.likes.max}</span></div>
        <div class="template-stat"><span>Amigos/dia</span><span>ate ${tpl.config.friends.max}</span></div>
        <div class="template-stat"><span>Grupos</span><span>${tpl.config.groups.min}-${tpl.config.groups.max}</span></div>
        <div class="template-stat"><span>Seguir</span><span>ate ${tpl.config.follows.max}</span></div>
        <div class="template-stat"><span>Reels</span><span>${tpl.config.reels.durationMin}-${tpl.config.reels.durationMax}min</span></div>
        <div class="template-stat"><span>Live</span><span>${tpl.config.live.duration}min</span></div>
      </div>
      <div class="template-apply">Clique para aplicar</div>
    </div>
  `).join('');
}

async function applyTemplate(index) {
  const tpl = CONFIG_TEMPLATES[index];
  if (!tpl) return;

  // Merge template config with current (keep adspower url and postTemplates)
  try {
    const res = await fetch(`${API}/api/config`);
    const current = res.ok ? await res.json() : {};

    const merged = {
      adspower: current.adspower || { apiUrl: 'http://local.adspower.net:50325' },
      ...tpl.config,
      postTemplates: current.postTemplates || ['Bom dia! Mais um dia de trabalho.']
    };

    const saveRes = await fetch(`${API}/api/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(merged)
    });
    if (!saveRes.ok) throw new Error(saveRes.statusText);

    renderConfigForm(merged);
    alert(`Template "${tpl.name}" aplicado com sucesso!`);
  } catch (err) {
    alert('Erro ao aplicar template: ' + err.message);
  }
}

/* ─── Config Form (single page) ────────────────────────────── */

const CONFIG_FIELDS = [
  { section: 'Interacoes', desc: 'Quantidade de acoes que o bot faz por sessao', fields: [
    { key: 'likes.min', label: 'Curtidas por sessao (minimo)', type: 'number' },
    { key: 'likes.max', label: 'Curtidas por sessao (maximo)', type: 'number' },
    { key: 'friends.max', label: 'Amigos adicionados por dia (maximo)', type: 'number' },
    { key: 'groups.min', label: 'Grupos por dia (minimo)', type: 'number' },
    { key: 'groups.max', label: 'Grupos por dia (maximo)', type: 'number' },
    { key: 'follows.max', label: 'Paginas seguidas por dia (maximo)', type: 'number' },
    { key: 'marketplace.maxTotal', label: 'Marketplace no processo inteiro (maximo)', type: 'number' },
  ]},
  { section: 'Tempo de Uso', desc: 'Quanto tempo o bot passa em cada atividade', fields: [
    { key: 'reels.durationMin', label: 'Assistir reels (minimo em minutos)', type: 'number' },
    { key: 'reels.durationMax', label: 'Assistir reels (maximo em minutos)', type: 'number' },
    { key: 'live.duration', label: 'Assistir live (minutos)', type: 'number' },
  ]},
  { section: 'Velocidade e Pausas', desc: 'Controla quao rapido ou devagar o bot age entre acoes', fields: [
    { key: 'session.delayBetweenActions.min', label: 'Espera entre acoes (minimo em segundos)', type: 'number' },
    { key: 'session.delayBetweenActions.max', label: 'Espera entre acoes (maximo em segundos)', type: 'number' },
    { key: 'session.longPause.min', label: 'Pausa longa (minimo em segundos)', type: 'number' },
    { key: 'session.longPause.max', label: 'Pausa longa (maximo em segundos)', type: 'number' },
    { key: 'session.longPauseChance', label: 'Chance de pausa longa (0 = nunca, 1 = sempre)', type: 'number', step: '0.05' },
    { key: 'session.lazyDayChance', label: 'Chance de dia preguicoso (0 = nunca, 1 = sempre)', type: 'number', step: '0.05' },
    { key: 'session.startTimeVarianceMin', label: 'Variacao de horario de inicio (minutos)', type: 'number' },
  ]},
  { section: 'Textos para Publicacao', desc: 'Frases que o bot usa ao publicar posts na pagina', fields: [
    { key: 'postTemplates', label: 'Um texto por linha', type: 'textarea' },
  ]},
];

function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function renderConfigForm(config) {
  const container = document.getElementById('config-form');
  if (!container) return;

  container.innerHTML = CONFIG_FIELDS.map(section => `
    <div class="config-row-section">
      <div class="config-row-header">
        <h3>${section.section}</h3>
        <p>${section.desc}</p>
      </div>
      ${section.fields.map(f => {
        const val = getNestedValue(config, f.key);
        if (f.type === 'textarea') {
          const textVal = Array.isArray(val) ? val.join('\n') : (val || '');
          return `<div class="config-row">
            <div class="config-row-label">${f.label}</div>
            <textarea data-config-key="${f.key}" rows="4" class="config-textarea">${textVal}</textarea>
          </div>`;
        }
        const step = f.step ? `step="${f.step}"` : '';
        return `<div class="config-row">
          <div class="config-row-label">${f.label}</div>
          <input type="number" data-config-key="${f.key}" value="${val ?? ''}" ${step} class="config-input">
        </div>`;
      }).join('')}
    </div>
  `).join('');
}

async function saveConfig() {
  const inputs  = document.querySelectorAll('[data-config-key]');
  const payload = {};

  inputs.forEach(el => {
    const key = el.dataset.configKey;
    let val   = el.value;

    if (key === 'postTemplates') {
      payload.postTemplates = val.split('\n').map(s => s.trim()).filter(Boolean);
      return;
    }

    if (val === 'true')  val = true;
    if (val === 'false') val = false;
    if (!isNaN(val) && val !== '' && typeof val !== 'boolean') val = Number(val);

    const parts = key.split('.');
    let obj = payload;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = val;
  });

  try {
    const res = await fetch(`${API}/api/config`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(res.statusText);
    alert('Configuracoes salvas com sucesso!');
  } catch (err) {
    alert('Erro ao salvar: ' + err.message);
  }
}

/* ═══════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════ */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;');
}

/* ═══════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  // Inject sidebar icons
  document.getElementById('icon-dashboard').innerHTML = ICONS.dashboard;
  document.getElementById('icon-profiles').innerHTML = ICONS.profiles;
  document.getElementById('icon-logs').innerHTML = ICONS.logs;
  document.getElementById('icon-config').innerHTML = ICONS.config;

  // Inject close icons into modal buttons
  document.getElementById('close-add-modal').innerHTML = ICONS.close;
  document.getElementById('close-day-modal').innerHTML = ICONS.close;
  document.getElementById('close-delete-modal').innerHTML = ICONS.close;

  // Nav button listeners
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      if (page) switchPage(page);
    });
  });

  // Filter listeners
  document.getElementById('filter-profile')?.addEventListener('change', applyLogFilters);
  document.getElementById('filter-type')?.addEventListener('change',    applyLogFilters);

  // Close modals on overlay click
  document.getElementById('add-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) hideAddModal();
  });
  document.getElementById('day-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) hideDayModal();
  });
  document.getElementById('delete-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) hideDeleteModal();
  });

  // Load initial page
  loadDashboard();
  connectSSE();

  // Auto-refresh dashboard every 10 seconds
  setInterval(() => {
    const activePage = document.querySelector('.page.active');
    if (activePage?.id === 'page-dashboard') {
      loadDashboard();
    }
  }, 10000);
});
