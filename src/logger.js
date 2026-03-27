const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

class Logger {
  constructor(profile, day) {
    this.profile = profile;
    this.day = day;
    this.startTime = new Date();
    this.entries = [];
    this.totalActions = 0;
    this.completedActions = 0;

    this._printHeader();
  }

  _printHeader() {
    const line = '─'.repeat(50);
    console.log(chalk.cyan(`┌${line}┐`));
    console.log(chalk.cyan(`│`) + chalk.bold.white(`  FB Warmer — Perfil: ${this.profile} — Dia ${this.day}`).padEnd(59) + chalk.cyan(`│`));
    console.log(chalk.cyan(`├${line}┤`));
  }

  _timestamp() {
    return new Date().toLocaleTimeString('pt-BR', { hour12: false });
  }

  setTotalActions(count) {
    this.totalActions = count;
  }

  success(msg) {
    const entry = { time: this._timestamp(), type: 'success', msg };
    this.entries.push(entry);
    this.completedActions++;
    console.log(chalk.cyan(`│`) + `  ${chalk.gray(entry.time)}  ${chalk.green('✓')} ${msg}`.padEnd(59) + chalk.cyan(`│`));
  }

  progress(msg) {
    const entry = { time: this._timestamp(), type: 'progress', msg };
    this.entries.push(entry);
    console.log(chalk.cyan(`│`) + `  ${chalk.gray(entry.time)}  ${chalk.blue('▶')} ${msg}`.padEnd(59) + chalk.cyan(`│`));
  }

  error(msg) {
    const entry = { time: this._timestamp(), type: 'error', msg };
    this.entries.push(entry);
    console.log(chalk.cyan(`│`) + `  ${chalk.gray(entry.time)}  ${chalk.red('✗')} ERRO: ${msg}`.padEnd(59) + chalk.cyan(`│`));
  }

  manual(msg) {
    const entry = { time: this._timestamp(), type: 'manual', msg };
    this.entries.push(entry);
    console.log(chalk.cyan(`│`) + `  ${chalk.gray(entry.time)}  ${chalk.yellow('⚠')} MANUAL: ${msg}`.padEnd(59) + chalk.cyan(`│`));
  }

  skip(msg) {
    const entry = { time: this._timestamp(), type: 'skip', msg };
    this.entries.push(entry);
    console.log(chalk.cyan(`│`) + `  ${chalk.gray(entry.time)}  ${chalk.gray('⊘')} Pulou: ${msg}`.padEnd(59) + chalk.cyan(`│`));
  }

  printFooter() {
    const line = '─'.repeat(50);
    const pct = this.totalActions > 0 ? Math.round((this.completedActions / this.totalActions) * 100) : 100;
    const filled = Math.round(pct / 10);
    const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
    console.log(chalk.cyan(`├${line}┤`));
    console.log(chalk.cyan(`│`) + `  Progresso: ${bar} ${pct}%  (${this.completedActions}/${this.totalActions} ações)`.padEnd(59) + chalk.cyan(`│`));
    console.log(chalk.cyan(`└${line}┘`));
  }

  getReport() {
    return {
      profile: this.profile,
      day: this.day,
      date: this.startTime.toISOString().split('T')[0],
      startTime: this.startTime.toLocaleTimeString('pt-BR', { hour12: false }),
      endTime: new Date().toLocaleTimeString('pt-BR', { hour12: false }),
      entries: this.entries
    };
  }
}

async function saveScreenshot(page, profile, errorName) {
  const dir = path.join(__dirname, '..', 'reports', 'errors');
  const filename = `${profile}_${Date.now()}_${errorName}.png`;
  await page.screenshot({ path: path.join(dir, filename), fullPage: false });
  return filename;
}

module.exports = { Logger, saveScreenshot };
