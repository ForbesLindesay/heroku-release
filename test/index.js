import 'dotenv/config';
import assert from 'assert';
import {writeFileSync} from 'fs';
import request from 'then-request';
import herokuRelease from '../src';

const TOKEN = (new Date()).toISOString();

writeFileSync(__dirname + '/fixture/token.txt', TOKEN);

assert(typeof herokuRelease === 'function');

herokuRelease('heroku-release-demo-staging', __dirname + '/fixture').then(() => {
  console.log('released staging');
  return request('GET', 'https://heroku-release-demo-staging.herokuapp.com/').getBody('utf8');
}).then(result => {
  assert(result === TOKEN);
  console.log('tested staging');
  return herokuRelease.promote('heroku-release-demo', 'heroku-release-demo-staging', 'heroku-release-demo-prod');
}).then(() => {
  console.log('promoted to production');
  return request('GET', 'https://heroku-release-demo-prod.herokuapp.com/').getBody('utf8');
}).then(result => {
  assert(result === TOKEN);
  console.log('tested production');
  writeFileSync(__dirname + '/fixture/token.txt', 'CLI Test');
}).done();
