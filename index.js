const yargs = require('yargs');

yargs
  .command('$0', 'Run warming for a profile day', (y) => {
    y.option('day', { type: 'number', describe: 'Day number (0-6)', demandOption: true });
    y.option('profile', { type: 'string', describe: 'Profile alias', demandOption: true });
    y.option('dry-run', { type: 'boolean', describe: 'Show plan without executing', default: false });
  }, (argv) => {
    console.log(`TODO: run day ${argv.day} for profile ${argv.profile}`);
  })
  .command('like', 'Run only like action', (y) => {
    y.option('profile', { type: 'string', demandOption: true });
  }, (argv) => {
    console.log(`TODO: like for ${argv.profile}`);
  })
  .command('reels', 'Run only reels action', (y) => {
    y.option('profile', { type: 'string', demandOption: true });
  }, (argv) => {
    console.log(`TODO: reels for ${argv.profile}`);
  })
  .help()
  .argv;
