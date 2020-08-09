const path = require('path');
const gulp = require('gulp');
const replace = require('gulp-replace');
const _ = require('lodash');
const requestPromise = require('../utils/request-promise');

const APP_CONFIG = require('../../api_config.json')['CONSTANTS'];
const conf = require('../config');

gulp.task('html:replace', function () {
  var endpoint = [APP_CONFIG.apiUrl, 'app-model'].join('/');

  var options = {
    url: endpoint,
    method: 'GET',
    json: true
  };

  return requestPromise(options)
    .then(replaceMeta);
});

function replaceMeta(body) {
  let re = /<!-- (.+) -->/g;

  return new Promise((resolve, reject) => {
    gulp.src(path.join(conf.paths.tmp, conf.paths.index))
      .pipe(replace(re, replaceCb.bind(this, body.data)))
      .pipe(gulp.dest(conf.paths.tmp))
      .on('end', resolve)
      .on('error', reject);
  });
}

function replaceCb(data, match, path) {
  let value = _.get(data, path);

  if (path.indexOf('favicon') > -1) {
    value = APP_CONFIG.apiUrl + value;
  }
  return !!value ? value : match;
}
