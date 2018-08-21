const gulp = require('gulp');
const APP_CONFIG = require('../../api_config.json')['CONSTANTS'];
const conf = require('../config');
const bufferToVinyl = require('buffer-to-vinyl');
const gulpNgConfig = require('gulp-ng-config');
const requestPromise = require('../utils/request-promise');

gulp.task('create:config', () => {
  if (!APP_CONFIG) throw new Error('Application config not found.');
  const config = {
    'APP_CONFIG': APP_CONFIG
  };

  const configJson = JSON.stringify(config);
  const configBuffer = new Buffer(configJson);

  return bufferToVinyl.stream(configBuffer, './api_config.json')
    .pipe(gulpNgConfig('APP_MODEL_CONFIG', { pretty: 2 }))
    .pipe(gulp.dest(conf.paths.tmp));
});

gulp.task('load:script', () => {
  if (!APP_CONFIG) throw new Error('Application config not found.');

  var endpoint = `${APP_CONFIG.apiUrl}/${conf.endpoints.scripts}`;

  var options = {
    url: endpoint,
    method: 'GET',
    json: true
  };

  return requestPromise(options)
    .then(createScripts.bind(this, conf.paths.serverScripts));
});

gulp.task('load:modules', () => uploadFile(conf.endpoints.serverModules, conf.paths.serverModules));
gulp.task('load:defaultModules', () => uploadFile(conf.endpoints.defaultServerModules,  conf.paths.defaultServerModules));
gulp.task('load:css', () => uploadFile(conf.endpoints.serverCss,  conf.paths.serverCss));

function uploadFile(serverPath, distPath) {
  if (!APP_CONFIG) throw new Error('Application config not found.');

  var endpoint = `${APP_CONFIG.apiUrl}/${serverPath}`;

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

  var endpoint = `${APP_CONFIG.apiUrl}/public/manifest.json`;

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