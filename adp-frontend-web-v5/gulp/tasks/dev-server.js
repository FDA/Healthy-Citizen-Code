const gulp = require('gulp');
const connect = require('gulp-connect');
const conf = require('../config');
const path = require('path');

const rewriteUrlWithSuffix = (req, res, next) => {
  const { appSuffix } = conf.APP_CONFIG();

  if (!appSuffix) {
    return next();
  }
  if (req.url !== appSuffix) {
    req.url = req.url.replace(appSuffix + '/', '/');
  }

  next();
}

gulp.task('connect:dev', function () {
  connect.server({
    root: [conf.paths.tmp, conf.paths.root],
    port: 3000,
    fallback: path.join(conf.paths.tmp, 'index.html'),
    middleware: function() {
      return [rewriteUrlWithSuffix];
    }
  });
});

gulp.task('connect:dist', function () {
  connect.server({
    root: [conf.paths.dist],
    port: 3000,
    fallback: path.join(conf.paths.dist, 'index.html'),
    middleware: function() {
      return [rewriteUrlWithSuffix];
    }
  });
});
