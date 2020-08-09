const gulp = require('gulp');
const APP_CONFIG = require('../../api_config.json')['CONSTANTS'];
const conf = require('../config');
const jsonfile = require('jsonfile');
const bufferToVinyl = require('buffer-to-vinyl');
const gulpNgConfig = require('gulp-ng-config');
const requestPromise = require('../utils/request-promise');

gulp.task('load:config', () => {
  if (!APP_CONFIG) throw new Error('Application config not found.');

  var endpoint = [APP_CONFIG.apiUrl, conf.endpoints.model].join('/');

  var options = {
    url: endpoint,
    method: 'GET',
    json: true
  };

  return requestPromise(options)
    .then(createConfig);
});

function createConfig(body) {
  var CONFIG_DATA = {
    'CONSTANTS': APP_CONFIG,
    'SCHEMAS': body.data.models,
    'INTERFACE': body.data.interface,
    'APP_PREFIX': body.data.interface.app.name,
    'MEDIA_TYPES': body.data.mediaTypes
  };

  var configJson = JSON.stringify(CONFIG_DATA);
  var configBuffer = new Buffer(configJson);

  return new Promise((resolve, reject) => {

    var appConfigPath = conf.paths.tmp + '/app-model.json';
    jsonfile.writeFile(appConfigPath, body.data, {spaces: 2}, error => {
      console.error(error);
    });

    bufferToVinyl.stream(configBuffer, conf.paths.modelConfig)
      .pipe(gulpNgConfig('APP_MODEL_CONFIG', { pretty: 2 }))
      .pipe(gulp.dest(conf.paths.tmp))
      .on('end', resolve)
      .on('error', reject);

  })
}

gulp.task('load:script', () => {
  if (!APP_CONFIG) throw new Error('Application config not found.');

  var endpoint = [APP_CONFIG.apiUrl, conf.endpoints.scripts].join('/');

  var options = {
    url: endpoint,
    method: 'GET',
    json: true
  };

  return requestPromise(options)
    .then(createScripts.bind(this, conf.paths.serverScripts));
});

gulp.task('load:modules', () => {
  if (!APP_CONFIG) throw new Error('Application config not found.');

  var endpoint = [APP_CONFIG.apiUrl, conf.endpoints.serverModules].join('/');

  var options = {
    url: endpoint,
    method: 'GET',
    json: true
  };

  return requestPromise(options)
    .then(createScripts.bind(this, conf.paths.serverModules));
});


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
