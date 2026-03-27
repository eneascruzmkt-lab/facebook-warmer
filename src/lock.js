const fs = require('fs');
const path = require('path');
const { stopBrowser } = require('./adspower');

const REPORTS_DIR = path.join(__dirname, '..', 'reports');

function lockPath(profile) {
  return path.join(REPORTS_DIR, `${profile}.lock`);
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return false;
  }
}

function acquireLock(profile) {
  const lp = lockPath(profile);
  if (fs.existsSync(lp)) {
    // Check if the process that created the lock is still running
    try {
      const lockData = JSON.parse(fs.readFileSync(lp, 'utf-8'));
      if (lockData.pid && !isProcessRunning(lockData.pid)) {
        // Process is dead, lock is stale — remove it
        fs.unlinkSync(lp);
      } else {
        throw new Error(`Perfil "${profile}" já está em execução.`);
      }
    } catch (e) {
      if (e.message.includes('já está em execução')) throw e;
      // Corrupted lock file, remove it
      fs.unlinkSync(lp);
    }
  }
  fs.writeFileSync(lp, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
}

function releaseLock(profile) {
  const lp = lockPath(profile);
  if (fs.existsSync(lp)) fs.unlinkSync(lp);
}

function cleanStaleLocks() {
  if (!fs.existsSync(REPORTS_DIR)) return;
  const files = fs.readdirSync(REPORTS_DIR).filter(f => f.endsWith('.lock'));
  for (const file of files) {
    const lp = path.join(REPORTS_DIR, file);
    try {
      const lockData = JSON.parse(fs.readFileSync(lp, 'utf-8'));
      if (lockData.pid && !isProcessRunning(lockData.pid)) {
        fs.unlinkSync(lp);
      }
    } catch (e) {
      // Corrupted lock, remove
      try { fs.unlinkSync(lp); } catch (_) {}
    }
  }
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

module.exports = { acquireLock, releaseLock, cleanStaleLocks, setupGracefulShutdown };
