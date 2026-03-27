const fs = require('fs');
const path = require('path');
const { loadProfiles } = require('./profiles');

const BACKUP_DIR = path.join(__dirname, '..', 'reports');

function backupCredentials() {
  const profiles = loadProfiles();
  const entries = Object.entries(profiles);

  if (entries.length === 0) return null;

  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toLocaleTimeString('pt-BR', { hour12: false }).replace(/:/g, '-');
  const filename = `backup_${date}_${time}.txt`;
  const filepath = path.join(BACKUP_DIR, filename);

  let content = '========================================\n';
  content += '  FB Warmer - Backup de Credenciais\n';
  content += `  Data: ${date}\n`;
  content += '========================================\n\n';

  for (const [alias, data] of entries) {
    content += `--- ${alias} ---\n`;
    content += `  AdsPower ID:   ${data.adspowerId || '-'}\n`;
    content += `  Email:         ${data.email || '-'}\n`;
    content += `  Senha:         ${data.emailPassword || '-'}\n`;
    content += `  2FA Secret:    ${data.twoFactorSecret || '-'}\n`;
    content += `  Status:        ${data.status || 'active'}\n`;
    content += `  Dia Atual:     ${data.currentDay || 0}\n`;
    content += `  Criado em:     ${data.createdAt || '-'}\n`;
    content += `  Notas:         ${data.notes || '-'}\n`;
    content += '\n';
  }

  content += '========================================\n';
  content += `  Total: ${entries.length} perfis\n`;
  content += '========================================\n';

  fs.writeFileSync(filepath, content, 'utf-8');
  return { filename, filepath, count: entries.length };
}

module.exports = { backupCredentials };
