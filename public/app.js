'use strict';

/* ─── Globals ───────────────────────────────────────────────── */
const API = '';  // same origin

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

let allLogs = [];    // cache for filter on Logs page
let sseSource = null;

/* ═══════════════════════════════════════════════════════════════
   NAVIGATION
═══════════════════════════════════════════════════════════════ */

function switchPage(page) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // Show target page
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  // Highlight nav button
  const navBtn = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navBtn) navBtn.classList.add('active');

  // Load data for the page
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
    { label: 'Total Perfis',      number: total,    color: '#00d4ff', icon: '👤' },
    { label: 'Ativos',            number: active,   color: '#00ff88', icon: '✅' },
    { label: 'Concluídos',        number: done,     color: '#a855f7', icon: '🏁' },
    { label: 'Ações Hoje',        number: actToday, color: '#ff8c00', icon: '⚡' },
  ];

  const grid = document.getElementById('stats-cards');
  if (!grid) return;
  grid.innerHTML = cards.map(c => `
    <div class="stat-card" style="--stat-color:${c.color}">
      <span class="stat-icon">${c.icon}</span>
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
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div>Nenhum perfil cadastrado</div>';
    return;
  }

  container.innerHTML = entries.map(([alias, data]) => renderProgress(alias, data)).join('');
}

function renderProgress(alias, data) {
  const day   = data.currentDay || 0;
  const pct   = Math.min(Math.round((day / 6) * 100), 100);
  const color = day > 6 ? '#a855f7' : (pct > 60 ? '#00ff88' : '#00d4ff');
  return `<div class="progress-item">
    <div class="progress-label">
      <span>${alias}</span>
      <span style="color:${color}">${day > 6 ? 'Concluído' : `Dia ${day}/6`}</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width:${pct}%;background:linear-gradient(90deg,#00d4ff,${color})"></div>
    </div>
  </div>`;
}

function renderActionsChart(stats) {
  const container = document.getElementById('actions-chart');
  if (!container) return;

  // Support both snake_case and camelCase from API
  const byDay = stats.actionsByDay || stats.actions_by_day || {};
  const labels = Object.keys(DAY_LABELS).map(Number).filter(k => k <= 6);

  if (!Object.keys(byDay).length) {
    container.innerHTML = '<div class="empty-state" style="height:100%;display:flex;align-items:center;justify-content:center;flex-direction:column"><div class="empty-state-icon">📊</div>Sem dados ainda</div>';
    return;
  }

  const values = labels.map(k => byDay[k] || 0);
  const maxVal = Math.max(...values, 1);

  container.innerHTML = labels.map((k, i) => {
    const pct   = Math.round((values[i] / maxVal) * 100);
    const short = DAY_LABELS[k].split(' ').slice(0, 2).join(' ');
    return `<div class="chart-bar-wrap">
      <div class="chart-value">${values[i] || ''}</div>
      <div class="chart-bar" style="height:${pct}%" title="${DAY_LABELS[k]}: ${values[i]} ações"></div>
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

      const liveLog = document.getElementById('live-log');
      if (!liveLog) return;

      const div = document.createElement('div');
      div.innerHTML = renderLogEntry(entry);
      liveLog.appendChild(div.firstElementChild);

      // Keep max 100 entries in the live log
      while (liveLog.children.length > 100) {
        liveLog.removeChild(liveLog.firstChild);
      }

      // Auto-scroll
      liveLog.scrollTop = liveLog.scrollHeight;
    };

    sseSource.onerror = () => {
      // Reconnect after 5 s on error
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
  const tbody = document.getElementById('profiles-tbody');
  if (!tbody) return;

  const entries = Object.entries(profiles || {});
  if (!entries.length) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><div class="empty-state-icon">👤</div>Nenhum perfil cadastrado ainda</div></td></tr>`;
    return;
  }

  tbody.innerHTML = entries.map(([alias, data]) => renderProfileRow(alias, data)).join('');
}

function renderProfileRow(alias, data) {
  const day         = data.currentDay || 0;
  const status      = data.status || 'active';
  const label       = DAY_LABELS[day] || '?';
  const statusBadge = status === 'active'
    ? '<span class="badge badge-active">Ativo</span>'
    : '<span class="badge badge-paused">Pausado</span>';

  return `<tr>
    <td><strong>${alias}</strong></td>
    <td><code>${data.adspowerId || data.adspower_id || ''}</code></td>
    <td>${day > 6 ? '✓' : day}</td>
    <td>${day > 6 ? 'Concluído' : label}</td>
    <td>${statusBadge}</td>
    <td class="actions-cell">
      ${day <= 6 ? `<button class="btn btn-sm btn-primary" onclick="runProfile('${alias}')">▶</button>` : ''}
      <button class="btn btn-sm btn-ghost" onclick="toggleProfile('${alias}')">${status === 'active' ? '⏸' : '▶'}</button>
      <button class="btn btn-sm btn-ghost" onclick="changeDay('${alias}', ${day})">✏️</button>
      <button class="btn btn-sm btn-danger" onclick="deleteProfile('${alias}')">🗑️</button>
    </td>
  </tr>`;
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
    alert('Erro de conexão: ' + err.message);
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
    const res = await fetch(`${API}/api/profiles/${encodeURIComponent(alias)}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ toggle: true })
    });
    if (!res.ok) throw new Error(res.statusText);
    loadProfiles();
  } catch (err) {
    alert('Erro ao alternar status: ' + err.message);
  }
}

async function changeDay(alias, currentDay) {
  const newDay = prompt(`Novo dia para "${alias}" (0–7):`, currentDay);
  if (newDay === null) return;
  const day = parseInt(newDay, 10);
  if (isNaN(day) || day < 0 || day > 7) {
    alert('Dia inválido. Use um número entre 0 e 7.');
    return;
  }

  try {
    const res = await fetch(`${API}/api/profiles/${encodeURIComponent(alias)}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ currentDay: day })
    });
    if (!res.ok) throw new Error(res.statusText);
    loadProfiles();
  } catch (err) {
    alert('Erro ao alterar dia: ' + err.message);
  }
}

async function deleteProfile(alias) {
  if (!confirm(`Remover o perfil "${alias}"? Esta ação não pode ser desfeita.`)) return;

  try {
    const res = await fetch(`${API}/api/profiles/${encodeURIComponent(alias)}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(res.statusText);
    loadProfiles();
  } catch (err) {
    alert('Erro ao remover perfil: ' + err.message);
  }
}

async function runProfile(alias) {
  try {
    const res = await fetch(`${API}/api/profiles/${encodeURIComponent(alias)}/run`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error(res.statusText);
    const data = await res.json();
    console.log('runProfile result:', data);
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
    alert('Erro ao rodar próximo perfil: ' + err.message);
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
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📝</div>Nenhum log encontrado</div>';
    return;
  }

  container.innerHTML = [...logs].reverse().map(renderLogEntry).join('');
}

function renderLogEntry(entry) {
  const icons  = { success: '✓', error: '✗', progress: '▶', manual: '⚠', skip: '⊘' };
  const colors = { success: '#00ff88', error: '#ff4444', progress: '#00d4ff', manual: '#ff8c00', skip: '#888' };
  const icon   = icons[entry.type]  || '•';
  const color  = colors[entry.type] || '#888';
  const time   = entry.time || entry.timestamp || '';
  const msg    = entry.msg  || entry.message   || '';
  return `<div class="log-entry">
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
    renderConfigForm(config);
  } catch (err) {
    console.error('loadConfig error:', err);
    renderConfigForm({});
  }
}

function renderConfigForm(config) {
  const grid = document.getElementById('config-form');
  if (!grid) return;

  // Group config keys by prefix (e.g. "adspower.url" → "adspower")
  const sections = {};
  for (const [key, value] of Object.entries(config)) {
    const parts   = key.split('.');
    const section = parts.length > 1 ? parts[0] : 'geral';
    const field   = parts.length > 1 ? parts.slice(1).join('.') : key;
    if (!sections[section]) sections[section] = [];
    sections[section].push({ key, field, value });
  }

  // Fallback: show a few defaults if config is empty
  if (!Object.keys(sections).length) {
    sections['geral'] = [
      { key: 'adspowerUrl',     field: 'adspowerUrl',     value: 'http://local.adspower.net:50325' },
      { key: 'scheduleEnabled', field: 'scheduleEnabled', value: false },
      { key: 'maxParallel',     field: 'maxParallel',     value: 1 },
    ];
  }

  grid.innerHTML = Object.entries(sections).map(([section, fields]) => `
    <div class="config-section">
      <h3>${section}</h3>
      ${fields.map(({ key, field, value }) => `
        <div class="form-group">
          <label>${field}</label>
          ${renderConfigInput(key, value)}
        </div>
      `).join('')}
    </div>
  `).join('');
}

function renderConfigInput(key, value) {
  if (typeof value === 'boolean') {
    return `<select id="cfg-${key}" data-config-key="${key}">
      <option value="true"  ${value ? 'selected' : ''}>Sim</option>
      <option value="false" ${!value ? 'selected' : ''}>Não</option>
    </select>`;
  }
  if (typeof value === 'number') {
    return `<input type="number" id="cfg-${key}" data-config-key="${key}" value="${value}">`;
  }
  return `<input type="text" id="cfg-${key}" data-config-key="${key}" value="${escapeAttr(String(value ?? ''))}">`;
}

async function saveConfig() {
  const inputs  = document.querySelectorAll('[data-config-key]');
  const payload = {};

  inputs.forEach(el => {
    const key = el.dataset.configKey;
    let val   = el.value;
    if (val === 'true')  val = true;
    if (val === 'false') val = false;
    if (!isNaN(val) && val !== '' && typeof val !== 'boolean') val = Number(val);

    // Rebuild nested object if key has dots
    const parts = key.split('.');
    if (parts.length === 1) {
      payload[key] = val;
    } else {
      if (!payload[parts[0]]) payload[parts[0]] = {};
      payload[parts[0]][parts.slice(1).join('.')] = val;
    }
  });

  try {
    const res = await fetch(`${API}/api/config`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(res.statusText);
    alert('Configurações salvas com sucesso!');
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

  // Close modal on overlay click
  document.getElementById('add-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) hideAddModal();
  });

  // Load initial page
  loadDashboard();
  connectSSE();
});
