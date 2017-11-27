import Promise from 'promise';
import request from 'then-request';
import requestStream from 'http-basic';
import {pack} from 'tar-pack';
import barrage from 'barrage';
import Heroku from 'heroku-client';

function addErrorContext(err, message) {
  const originalMessage = (err.body && err.body.message) ? err.body.message : err.message;
  return new Error(message + '\n' + originalMessage);
}

function publish(appName, folder, {auth, version, silent} = {}) {
  if (typeof appName !== 'string' || !appName) {
    throw new TypeError('You must provide a string for appName');
  }
  if (typeof folder !== 'string' || !folder) {
    throw new TypeError('You must provide a string for folder');
  }
  if (auth === undefined) auth = process.env.HEROKU_API_TOKEN;
  if (typeof auth !== 'string' || !auth) {
    throw new TypeError(
      'You must provide a string for the "auth" option or set the "HEROKU_API_TOKEN" environment variable'
    );
  }
  if (version === undefined) version = (new Date()).toISOString();
  if (typeof version !== 'string' || !version) {
    throw new TypeError('The "version" option must be a string');
  }
  const heroku = new Heroku({token: auth});
  const tarballPromise = barrage(pack(folder, {ignoreFiles: []})).buffer('buffer');
  const sourcesPromise = heroku.post('/sources').then(
    ({source_blob: {get_url: getUrl, put_url: putUrl}}) => ({getUrl, putUrl}),
  );
  const appExistsPromise = heroku.get(`/apps/${appName}`).catch(err => {
    throw addErrorContext(err, 'Could not find the app: ' + appName);
  });
  return Promise.all([tarballPromise, sourcesPromise, appExistsPromise]).then(([tarball, sources]) => {
    if (!silent) console.log('Uploading bundle');
    return request('put', sources.putUrl, {body: tarball}).getBody().then(() => sources.getUrl);
  }).then(getUrl => {
    if (!silent) console.log('Uploaded bundle');
    return heroku.post(`/apps/${appName}/builds`, {
      body: {
        source_blob: {
          url: getUrl,
          version,
        },
      },
    });
  }).then(result => {
    return new Promise((resolve, reject) => {
      requestStream('GET', result.output_stream_url, {
        followRedirects: true,
        maxRedirects: 10,
        gzip: true,
        retry: true,
      }, (err, res) => {
        if (err) return reject(err);
        try {
          res.getBody();
          res.body.on('error', reject);
          res.body.on('end', resolve);
          if (!silent) res.body.pipe(process.stdout);
          else res.body.on('data', () => {});
        } catch (ex) {
          reject(ex);
        }
      });
    }).then(() => {
      return heroku.get(`/apps/${appName}/builds/${result.id}`);
    }).then(info => {
      if (info.status !== 'succeeded') {
        const err = new Error('Status was "' + info.status + '", expected "succeeded"');
        err.info = info;
        throw err;
      } else {
        if (!silent) console.log('release complete');
        return new Promise(resolve => setTimeout(() => resolve(info), 2000));
      }
    });
  });
}

function isUUID(str) {
  return /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/.test(str);
}
function pipelineNameToID(pipelineName, heroku) {
  if (isUUID(pipelineName)) {
    return Promise.resolve(pipelineName);
  }
  return heroku.get(`/pipelines/${pipelineName}`).then(result => {
    if (!isUUID(result.id)) {
      throw new Error('Expected the pipeline id to be a uuid but got "' + result.id + '"');
    }
    return result.id;
  }, err => {
    throw addErrorContext(err, 'Could not find the pipeline: ' + pipelineName);
  });
}
function appNameToID(appName, heroku) {
  if (isUUID(appName)) {
    return Promise.resolve(appName);
  }
  return heroku.get(`/apps/${appName}`).then(result => {
    if (!isUUID(result.id)) {
      throw new Error('Expected the app id to be a uuid but got "' + result.id + '"');
    }
    return result.id;
  }, err => {
    throw addErrorContext(err, 'Could not find the app: ' + appName);
  });
}
function makeArray(value) {
  if (Array.isArray(value)) return value;
  else return [value];
}
function promote(pipelineName, sourceAppName, targetAppNames, {auth, silent} = {}) {
  if (typeof pipelineName !== 'string' || !pipelineName) {
    throw new TypeError('You must provide a string for pipelineName');
  }
  if (typeof sourceAppName !== 'string' || !sourceAppName) {
    throw new TypeError('You must provide a string for sourceAppName');
  }
  if (
    typeof targetAppNames !== 'string' &&
    (!Array.isArray(targetAppNames) || !targetAppNames.every(n => n && typeof n === 'string'))
  ) {
    throw new TypeError('You must provide string or an array of strings for targetAppNames');
  }
  if (auth === undefined) auth = process.env.HEROKU_API_TOKEN;
  if (typeof auth !== 'string' || !auth) {
    throw new TypeError(
      'You must provide a string for the "auth" option or set the "HEROKU_API_TOKEN" environment variable'
    );
  }
  const heroku = new Heroku({token: auth});
  return Promise.all([
    pipelineNameToID(pipelineName, heroku),
    appNameToID(sourceAppName, heroku),
    Promise.all(makeArray(targetAppNames).map(n => appNameToID(n, heroku))),
  ]).then(([pipelineID, sourceAppID, targetAppIDs]) => {
    return heroku.post(`/pipeline-promotions`, {
      body: {
        pipeline: {id: pipelineID},
        source: {app: {id: sourceAppID}},
        targets: targetAppIDs.map(id => ({app: {id}})),
      },
    }).catch(err => {
      throw addErrorContext(err, 'Could not create the promotion');
    });
  }).then(function pollStatus(info) {
    if (info.status === 'pending') {
      return heroku.get(`/pipeline-promotions/${info.id}`).then(pollStatus, err => {
        throw addErrorContext(err, 'Could not get the promotion info');
      });
    }
    if (info.status !== 'completed') {
      const err = new Error('Status was "' + info.status + '", expected "completed"');
      err.info = info;
      throw err;
    }
    if (!silent) console.log('promotion complete');
    return new Promise(resolve => setTimeout(() => resolve(info), 2000));
  });
}

module.exports = publish;
module.exports.publish = publish;
module.exports.promote = promote;
