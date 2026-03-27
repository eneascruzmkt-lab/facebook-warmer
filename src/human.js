const { createCursor } = require('ghost-cursor');
const config = require('../config.json');

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

async function sleep(ms) {
  const jitter = ms * randFloat(-0.2, 0.2);
  return new Promise(r => setTimeout(r, ms + jitter));
}

async function humanDelay() {
  const { min, max } = config.session.delayBetweenActions;
  await sleep(randInt(min, max) * 1000);
}

async function shortDelay() {
  await sleep(randInt(1000, 3000));
}

async function clickDelay() {
  const { min, max } = config.mouse.clickDelay;
  await sleep(randInt(min, max));
}

async function maybeWait() {
  if (Math.random() < config.session.longPauseChance) {
    const { min, max } = config.session.longPause;
    await sleep(randInt(min, max) * 1000);
  }
}

function createHumanCursor(page) {
  return createCursor(page, undefined, true);
}

async function humanClick(cursor, element) {
  await clickDelay();
  await cursor.click(element);
}

async function humanScroll(page) {
  const distance = randInt(200, 800);
  const steps = randInt(5, 15);
  const stepSize = distance / steps;

  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel({ deltaY: stepSize });
    await sleep(randInt(50, 200));
  }

  // Sometimes scroll back up a bit
  if (Math.random() < 0.15) {
    const backDistance = randInt(100, 300);
    await page.mouse.wheel({ deltaY: -backDistance });
    await sleep(randInt(300, 800));
  }
}

async function humanType(page, text) {
  for (const char of text) {
    // Occasional typo
    if (Math.random() < 0.03) {
      const wrongChar = String.fromCharCode(char.charCodeAt(0) + randInt(-2, 2));
      await page.keyboard.type(wrongChar, { delay: randInt(80, 200) });
      await sleep(randInt(200, 500));
      await page.keyboard.press('Backspace');
      await sleep(randInt(100, 300));
    }
    await page.keyboard.type(char, { delay: randInt(50, 180) });

    // Pause between words
    if (char === ' ') {
      await sleep(randInt(100, 400));
    }
  }
}

function waitForEnter(msg) {
  const readline = require('readline');
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(msg, () => { rl.close(); resolve(); });
  });
}

function askQuestion(msg) {
  const readline = require('readline');
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(msg, (ans) => { rl.close(); resolve(ans); });
  });
}

async function withRetry(fn, maxRetries, delayMs = 3000) {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === maxRetries) throw e;
      await sleep(delayMs);
    }
  }
}

module.exports = {
  randInt, randFloat, sleep, humanDelay, shortDelay, clickDelay,
  maybeWait, createHumanCursor, humanClick, humanScroll, humanType,
  waitForEnter, askQuestion, withRetry
};
