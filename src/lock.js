const fs = require('fs');
const path = require('path');
const { stopBrowser } = require('./adspower');

const REPORTS_DIR = path.join(__dirname, '..', 'reports');

function lockPath(profile) {
  return path.join(REPORTS_DIR, `${profile}.lock`);
}

function acquireLock(profile) {
  const lp = lockPath(profile);
  if (fs.existsSync(lp)) {
    throw new Error(`Perfil "${profile}" já está em execução. Lock encontrado: ${lp}`);
  }
  fs.writeFileSync(lp, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
}

function releaseLock(profile) {
  const lp = lockPath(profile);
  if (fs.existsSync(lp)) fs.unlinkSync(lp);
}

function setupGracefulShutdown(profile, adspowerId, logger, saveReportFn) {
  const handler = async () => {
    console.log('\n\nEncerrando graciosamente...');
    try {
      if (saveReportFn) saveReportFn();
      await stopBrowser(adspowerId).catch(() => {});
      releaseLock(profile);
    } catch (e) { /* ignore */ }
    process.exit(0);
  };
  process.on('SIGINT', handler);
  process.on('SIGTERM', handler);
  return handler;
}

module.exports = { acquireLock, releaseLock, setupGracefulShutdown };
