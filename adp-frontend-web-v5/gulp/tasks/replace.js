const path = require('path');
const gulp = require('gulp');
const replace = require('gulp-replace');
const rename = require('gulp-rename');
const _ = require('lodash');
const requestPromise = require('../utils/request-promise');

const conf = require('../config');
const APP_CONFIG = conf.APP_CONFIG();

gulp.task('html:replace', function () {
  var endpoint = [APP_CONFIG.apiUrl, 'build-app-model'].join('/');

  var options = {
    url: endpoint,
    method: 'GET',
    json: true,
  };

  return requestPromise(options)
    .then(function ({ data }) {
      const socketIoClientPath = `${APP_CONFIG.apiUrl}/socket.io/socket.io.js`;
      const { APP_SUFFIX } = process.env;
      const appSuffix = !!APP_SUFFIX ? '/' + APP_SUFFIX : '';
      const baseUrl = !!APP_SUFFIX ? '/' + APP_SUFFIX : '/';

      return replaceMeta({
        data: { ...data, socketIoClientPath, appSuffix, baseUrl },
        srcFileName: `${conf.paths.tmp}/index.html`,
        dstFileName: 'index.html',
      });
    });
});

gulp.task('sw:replace', function () {
  const endpoint = [APP_CONFIG.apiUrl, 'build-app-model'].join('/');

  const options = {
    url: endpoint,
    method: 'GET',
    json: true
  };

  const { APP_SUFFIX } = process.env;
  return requestPromise(options)
    .then(({ data }) => replaceMeta({
      data: { ...data, baseUrl: !!APP_SUFFIX ? '/' + APP_SUFFIX : '' },
      srcFileName: `${conf.paths.src}/sw-manager.js.template`,
      dstFileName: 'sw-manager.js',
    }));
});

gulp.task('clientModules:replace', async () => {
  const opts = {
    url: `${APP_CONFIG.resourceUrl}/${conf.endpoints.clientModules}`,
    method: 'GET',
    json: true
  }

  const { data } = await requestPromise(opts);
  const moduleNames = data
    .filter(item => /.+\.module\.js$/.test(item.name))
    .map(({ name }) => {
      const fileName = name.split('/').pop();
      const [moduleName] = fileName.match(/(^|\/)[^.]+/);
      return 'app.' + _.camelCase(moduleName);
    })
    .filter(v => !!v);

  return replaceMeta({
    data: { moduleList: JSON.stringify(moduleNames) },
    srcFileName: `${conf.paths.src}/app-client.module.js.template`,
    dstFileName: 'app-client.module.js',
  });
});

function replaceMeta({ data, srcFileName, dstFileName }) {
  let re = /{{ (.+) }}/g;

  return new Promise((resolve, reject) => {
    gulp.src(path.join(srcFileName))
      .pipe(replace(re, replaceCb.bind(this, data)))
      .pipe(rename(dstFileName))
      .pipe(gulp.dest(conf.paths.tmp))
      .on('end', resolve)
      .on('error', reject);
  });
}

function replaceCb(data, match, path) {
  let value = _.get(data, path, null);

  if (path.indexOf('favicon') > -1) {
    value = APP_CONFIG.resourceUrl + value;
  } else if (path === 'interface.app.offlineModeSupport') {
    value = value === null ? false : value;
  }

  return value === null ? match : value;
}
