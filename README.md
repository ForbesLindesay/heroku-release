# heroku-release

Release apps to heroku without using Git (so that .gitignored assets are included)

[![Build Status](https://img.shields.io/travis/ForbesLindesay/heroku-release/master.svg)](https://travis-ci.org/ForbesLindesay/heroku-release)
[![Dependency Status](https://img.shields.io/david/ForbesLindesay/heroku-release/master.svg)](http://david-dm.org/ForbesLindesay/heroku-release)
[![NPM version](https://img.shields.io/npm/v/heroku-release.svg)](https://www.npmjs.org/package/heroku-release)

## Installation

```
npm install heroku-release --save
```

## Usage

Run `heroku auth:token` to get your secret heroku api token.  Put this value in the environment variable `HEROKU_API_TOKEN`.

### API

```js
const {publish, promote} = require('heroku-release');

publish(
  'my-staging-app-name',
  __dirname,
  options,
).then(() => {
  return promote('my-pipeline', 'my-staging-app-name', 'my-prod-app-name', options);
}).done();
```

options:
 - `auth` - defaults to `process.env.HEROKU_API_TOKEN`
 - `silent` - disable all logging output, defaults to `false`
 - `version` - human readable tag to identify the release, defaults to the current date and time

### CLI

```
heroku-release publish --app my-app-name
```

Options:

 - `--app` - the app name
 - `--dir` - the directory (relative to the current working directory), defaults to current working directory
 - `--version` - human readable tag to identify the release, defaults to the current date and time or build number in CircleCI
 - `--auth` - Heroku api token, defaults to `process.env.HEROKU_API_TOKEN`
 - `--silent` - Disable all console output, except errors


```
heroku-release promote --pipeline my-pipeline-name --source my-staging-app-name --target my-prod-app-name
```

Options:

 - `--pipeline` - the pipeline name or ID
 - `--source` - the source app's name or ID
 - `--target` - the target app's name or ID
 - `--auth` - Heroku api token, defaults to `process.env.HEROKU_API_TOKEN`
 - `--silent` - Disable all console output, except errors

## License

MIT
