import assert from 'assert';
import {readFileSync} from 'fs';
import request from 'then-request';

const TOKEN = readFileSync(__dirname + '/fixture/token.txt', 'utf8');

request('GET', 'https://heroku-release-demo-' + process.argv[2] + '.herokuapp.com/').getBody('utf8').done(result => {
  assert(result === TOKEN);
  console.log(process.argv[2] + ' test passed');
});