const { createEmail } = require('../actions/create-email');
const { sleep, randInt } = require('../human');

async function runDay0(page, cursor, logger, profileAlias) {
  logger.setTotalActions(1);
  await createEmail(page, cursor, logger, profileAlias);
}

module.exports = { runDay0 };
