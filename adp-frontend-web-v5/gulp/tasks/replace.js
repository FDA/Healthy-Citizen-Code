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
    json: true
  };

  return requestPromise(options)
    .then(function (body) {
      return replaceMeta(body, `${conf.paths.tmp}/index.html`, 'index.html')
    });
});

gulp.task('sw:replace', function () {
  var endpoint = [APP_CONFIG.apiUrl, 'build-app-model'].join('/');

  var options = {
    url: endpoint,
    method: 'GET',
    json: true
  };

  return requestPromise(options)
    .then(function (body) {
      return replaceMeta(body, `${conf.paths.src}/sw-manager.js.template`, 'sw-manager.js')
    });
});

function replaceMeta(body, src, newName) {
  let re = /<!-- (.+) -->/g;

  return new Promise((resolve, reject) => {
    gulp.src(path.join(src))
      .pipe(replace(re, replaceCb.bind(this, body.data)))
      .pipe(rename(newName))
      .pipe(gulp.dest(conf.paths.tmp))
      .on('end', resolve)
      .on('error', reject);
  });
}

function replaceCb(data, match, path) {
  let value = _.get(data, path, null);

  if (path.indexOf('favicon') > -1) {
    value = APP_CONFIG.apiUrl + value;
  } else if (path === 'interface.app.offlineModeSupport') {
    value = value === null ? false : value;
  }

  return value === null ? match : value;
}
