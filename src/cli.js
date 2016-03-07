#!/usr/bin/env node

import {resolve} from 'path';
import release from './index.js';

function arg(name, ...environmentVariables) {
  const index = process.argv.indexOf(name);
  if (index !== -1) {
    return process.argv[index + 1];
  }
  for (const n of environmentVariables) {
    if (process.env[n]) return process.env[n];
  }
}
const auth = arg('--auth', 'HEROKU_API_TOKEN');
const name = arg('--app', 'CIRCLE_PROJECT_REPONAME');
const version = (
  arg('--version') || (process.env.CIRCLE_BUILD_NUM ? 'Build ' + process.env.CIRCLE_BUILD_NUM : undefined)
);
const dir = resolve(arg('--dir') || process.cwd());


release(name, dir, {
  auth,
  version,
}).done();
