const gulp = require('gulp');
const conf = require('../config');
const APP_CONFIG = conf.APP_CONFIG();
const bufferToVinyl = require('buffer-to-vinyl');
const gulpNgConfig = require('gulp-ng-config');
const requestPromise = require('../utils/request-promise');

gulp.task('create:config', () => {
  const configJson = JSON.stringify({'APP_CONFIG': APP_CONFIG});
  const configBuffer = new Buffer(configJson);

  return bufferToVinyl.stream(configBuffer, './api_config.json')
    .pipe(gulpNgConfig('APP_MODEL_CONFIG', { pretty: 2 }))
    .pipe(gulp.dest(conf.paths.tmp));
});

gulp.task('load:script', () => {
  var endpoint = `${APP_CONFIG.apiBuildUrl}/${conf.endpoints.appModelCode}`;

  var options = {
    url: endpoint,
    method: 'GET',
    json: true
  };

  return requestPromise(options)
    .then(createScripts.bind(this, conf.paths.appModelCodePath));
});

gulp.task('load:modules', uploadClientModules);
gulp.task('load:css', () => uploadFile(conf.endpoints.serverCss,  conf.paths.serverCss));

async function uploadClientModules() {
  const { data } = await requestModulesFiles();

  const nameToSrcPath = name => `${conf.endpoints.clientModules}/${name}`;
  const nameToDistPath = name => `${conf.paths.clientModulesFolder}/${name}`;
  const promises = data.map(({ name }) => uploadFile(nameToSrcPath(name), nameToDistPath(name)));

  return Promise.all(promises);
}

function requestModulesFiles() {
  const opts = {
    url: `${APP_CONFIG.apiBuildUrlForResource}/${conf.endpoints.clientModules}`,
    method: 'GET',
    json: true
  }

  return requestPromise(opts);
}

function uploadFile(serverPath, distPath) {
  if (!APP_CONFIG) throw new Error('Application config not found.');

  var endpoint = `${APP_CONFIG.apiBuildUrlForResource}/${serverPath}`;

  var options = {
    url: endpoint,
    method: 'GET',
    json: true
  };

  return requestPromise(options)
    .then(createScripts.bind(this, distPath));
}

function createScripts(fileName, body) {
  if (body.code === 'ResourceNotFound') {
    var file = '';
  } else {
    file = body;
  }

  return new Promise(function (resolve, reject) {
    bufferToVinyl.stream(new Buffer(file), fileName)
      .pipe(gulp.dest(conf.paths.tmp))
      .on('end', resolve)
      .on('error', reject);
  })
}

gulp.task('load:manifest', () => {
  if (!APP_CONFIG) throw new Error('Application config not found.');

  var endpoint = `${APP_CONFIG.apiBuildUrlForResource}/public/manifest.json`;

  var options = {
    url: endpoint,
    method: 'GET'
  };

  return requestPromise(options)
    .then(writeManifest)
    .catch(e => {
      console.log(`Error while loading ${endpoint}:`, e);
    });
});

function writeManifest(body) {
  if (body.code === 'ResourceNotFound') {
    var file = '';
  } else {
    file = body;
  }

  return new Promise(function (resolve, reject) {
    bufferToVinyl.stream(new Buffer(file), 'manifest.json')
      .pipe(gulp.dest(conf.paths.tmp))
      .on('end', resolve)
      .on('error', reject);
  })
}





