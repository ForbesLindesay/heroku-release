#!/usr/bin/env node

import 'dotenv/config';
import {resolve} from 'path';
import {publish, promote} from './index.js';

require('yargs')
  .command(['publish', '*'], 'Deploy a new version of an app to heroku', (yargs) => {
    return yargs
      .option('app', {
        alias: 'a',
        demandOption: true,
        describe: 'Your heroku app name or app ID',
        type: 'string',
      })
      .option('version', {
        alias: 'v',
        describe: 'The build number for heroku',
        type: 'string',
      })
      .option('dir', {
        alias: 'd',
        default: '$CWD',
        describe: 'The directory to deploy a relase from',
        type: 'string',
      });
  }, (argv) => {
    const appName = argv.app;
    const appDir = resolve(argv.dir === '$CWD' ? process.cwd() : argv.dir);
    const auth = argv.auth === '$HEROKU_API_TOKEN' ? process.env.HEROKU_API_TOKEN : argv.auth;
    const version = (
      argv.version || (process.env.CIRCLE_BUILD_NUM ? 'Build ' + process.env.CIRCLE_BUILD_NUM : undefined)
    );
    publish(appName, appDir, {
      auth,
      version,
    }).done();
  })
  .command(['promote'], 'Promote a heroku app within a pipeline', (yargs) => {
    return yargs
      .option('pipeline', {
        alias: 'p',
        demandOption: true,
        describe: 'The id or name of the pipeline',
        type: 'string',
      })
      .option('source', {
        alias: 's',
        demandOption: true,
        describe: 'The id or name of the source app',
        type: 'string',
      })
      .option('target', {
        alias: 't',
        demandOption: true,
        describe: 'The ids or names of the target apps',
        type: 'array',
      });
  }, (argv) => {
    const auth = argv.auth === '$HEROKU_API_TOKEN' ? process.env.HEROKU_API_TOKEN : argv.auth;
    promote(argv.pipeline, argv.source, argv.target, {auth}).done();
  })
  .option('auth', {
    alias: 'A',
    default: '$HEROKU_API_TOKEN',
    describe: 'Your heroku API token',
    type: 'string',
  }).check(argv => {
    if (!argv.auth && !process.env.HEROKU_API_TOKEN) {
      throw new Error('You must either specify `--auth` on the command line, or set the HEROKU_API_TOKEN environment variable.');
    }
    return true;
  })
  .option('silent', {
    alias: 'S',
    default: false,
    describe: 'Disable all logging output',
    type: 'boolean',
  })
  .help()
  .argv;
