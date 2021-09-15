const gulp = require('gulp');
const path = require('path');
const bufferToVinyl = require('buffer-to-vinyl');
const gulpNgConfig = require('gulp-ng-config');
const streamToPromise = require('stream-to-promise');
const fs = require('fs-extra');
const conf = require('../config');
const requestPromise = require('../utils/request-promise');

gulp.task('create:config', async () => {
  const { runtimeConfig, buildConfig } = await conf.buildAppConfig();

  const clientAppConfigPromise = streamToPromise(
    bufferToVinyl
      .stream(Buffer.from(JSON.stringify({ APP_CONFIG: runtimeConfig })), './api_config.json')
      .pipe(gulpNgConfig('APP_MODEL_CONFIG', { pretty: 2 }))
      .pipe(gulp.dest(conf.paths.tmp))
  );
  const appConfigPromise = fs.outputFile(path.resolve(conf.paths.buildAppConfig), JSON.stringify(buildConfig, null, 2));

  return Promise.all([clientAppConfigPromise, appConfigPromise]);
});

gulp.task('load:script', () => {
  const { apiBuildUrl } = conf.getAppConfig();
  const endpoint = `${apiBuildUrl}/${conf.endpoints.appModelCode}`;

  const options = {
    url: endpoint,
    method: 'GET',
    json: true,
  };

  return requestPromise(options).then(createScripts.bind(this, conf.paths.appModelCodePath));
});

gulp.task('load:modules', uploadClientModules);
async function uploadClientModules() {
  const { buildResourceUrl } = conf.getAppConfig();
  const { data } = await requestModulesFiles(buildResourceUrl);

  const nameToSrcPath = (name) => `${conf.endpoints.clientModules}/${name}`;
  const nameToDistPath = (name) => `${conf.paths.clientModulesFolder}/${name}`;
  const promises = data.map(({ name }) => uploadFile(nameToSrcPath(name), nameToDistPath(name), buildResourceUrl));

  return Promise.all(promises);
}

gulp.task('load:css', () => {
  const { buildResourceUrl } = conf.getAppConfig();
  return uploadFile(conf.endpoints.serverCss, conf.paths.serverCss, buildResourceUrl);
});

function requestModulesFiles(buildResourceUrl) {
  const opts = {
    url: `${buildResourceUrl}/${conf.endpoints.clientModules}`,
    method: 'GET',
    json: true,
  };

  return requestPromise(opts);
}

function uploadFile(serverPath, distPath, buildResourceUrl) {
  const endpoint = `${buildResourceUrl}/${serverPath}`;

  const options = {
    url: endpoint,
    method: 'GET',
    json: true,
  };

  return requestPromise(options).then(createScripts.bind(this, distPath));
}

function createScripts(fileName, body) {
  const file = body.code === 'ResourceNotFound' ? '' : body;

  const stream = bufferToVinyl.stream(Buffer.from(file), fileName).pipe(gulp.dest(conf.paths.tmp));
  return streamToPromise(stream);
}

gulp.task('load:manifest', () => {
  const { buildResourceUrl } = conf.getAppConfig();
  const endpoint = `${buildResourceUrl}/public/manifest.json`;

  const options = {
    url: endpoint,
    method: 'GET',
  };

  return requestPromise(options)
    .then(writeManifest)
    .catch((e) => {
      console.log(`Error while loading ${endpoint}:`, e);
    });
});

function writeManifest(body) {
  const file = body.code === 'ResourceNotFound' ? '' : body;

  const stream = bufferToVinyl.stream(Buffer.from(file), 'manifest.json').pipe(gulp.dest(conf.paths.tmp));
  return streamToPromise(stream);
}
