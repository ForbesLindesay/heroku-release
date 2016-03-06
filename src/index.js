import Promise from 'promise';
import request from 'then-request';
import requestStream from 'http-basic';
import {pack} from 'tar-pack';
import barrage from 'barrage';
import Heroku from 'heroku-client';

function publish(appName, folder, {auth, version} = {}) {
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
  const sourcesPromise = heroku.apps(appName).sources().create().then(
    ({source_blob: {get_url: getUrl, put_url: putUrl}}) => ({getUrl, putUrl}),
  );
  return Promise.all([tarballPromise, sourcesPromise]).then(([tarball, sources]) => {
    console.log('Uploading bundle to: ' + sources.getUrl);
    return request('put', sources.putUrl, {body: tarball}).getBody().then(() => sources.getUrl);
  }).then(getUrl => {
    console.log('Uploaded bundle to: ' + getUrl);
    return heroku.apps(appName).builds().create({
      source_blob: {
        url: getUrl,
        version,
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
        res.body.on('error', reject);
        res.body.on('end', resolve);
        res.body.pipe(process.stdout);
      });
    }).then(() => {
      return heroku.apps(appName).builds(result.id).info();
    }).then(info => {
      if (info.status !== 'succeeded') {
        const err = new Error('Status was "' + info.status + '", expected "succeeded"');
        err.info = info;
      } else {
        return info;
      }
    });
  });
}

module.exports = publish;
