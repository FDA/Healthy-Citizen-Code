const path = require('path');
const gulp = require('gulp');
const replace = require('gulp-replace');
const rename = require('gulp-rename');
const _ = require('lodash');
const streamToPromise = require('stream-to-promise');
const requestPromise = require('../utils/request-promise');

const conf = require('../config');

gulp.task('html:replace', () => {
  const { apiBuildUrl, appSuffix, resourceUrl } = conf.getAppConfig();
  const endpoint = [apiBuildUrl, 'build-app-model'].join('/');

  const options = {
    url: endpoint,
    method: 'GET',
    json: true,
  };

  return requestPromise(options).then(({ data }) => {
    const baseUrl = appSuffix || '/';
    const baseUrlForManifest = `${appSuffix}/`;

    return replaceMeta({
      data: { ...data, baseUrl, baseUrlForManifest },
      srcFileName: `${conf.paths.tmp}/index.html`,
      dstFileName: 'index.html',
      resourceUrl,
    });
  });
});

gulp.task('sw:replace', () => {
  const { apiBuildUrl, appSuffix } = conf.getAppConfig();
  const endpoint = [apiBuildUrl, 'build-app-model'].join('/');

  const options = {
    url: endpoint,
    method: 'GET',
    json: true,
  };

  return requestPromise(options).then(({ data }) =>
    replaceMeta({
      data: { ...data, baseUrl: appSuffix },
      srcFileName: `${conf.paths.src}/sw-manager.js.template`,
      dstFileName: 'sw-manager.js',
    })
  );
});

gulp.task('clientModules:replace', async () => {
  const { buildResourceUrl } = conf.getAppConfig();
  const opts = {
    url: `${buildResourceUrl}/${conf.endpoints.clientModules}`,
    method: 'GET',
    json: true,
  };

  const { data } = await requestPromise(opts);
  const moduleNames = data
    .filter((item) => /.+\.module\.js$/.test(item.name))
    .map(({ name }) => {
      const fileName = name.split('/').pop();
      const [moduleName] = fileName.match(/(^|\/)[^.]+/);
      return `app.${_.camelCase(moduleName)}`;
    })
    .filter((v) => !!v);

  return replaceMeta({
    data: { moduleList: JSON.stringify(moduleNames) },
    srcFileName: `${conf.paths.src}/app-client.module.js.template`,
    dstFileName: 'app-client.module.js',
  });
});

function replaceMeta({ data, srcFileName, dstFileName, resourceUrl }) {
  const re = /{{ (.+) }}/g;
  const stream = gulp
    .src(path.join(srcFileName))
    .pipe(replace(re, replaceCb.bind(this, data)))
    .pipe(rename(dstFileName))
    .pipe(gulp.dest(conf.paths.tmp));

  return streamToPromise(stream);

  function replaceCb(_data, match, _path) {
    let value = _.get(_data, _path, null);

    if (_path.indexOf('favicon') > -1) {
      value = resourceUrl + value;
    } else if (_path === 'interface.app.offlineModeSupport') {
      value = value === null ? false : value;
    }
    return value === null ? match : value;
  }
}
