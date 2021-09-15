const gulp = require('gulp');
const connect = require('gulp-connect');
const path = require('path');
const conf = require('../config');

const rewriteUrlWithSuffix = (appSuffix) => (req, res, next) => {
  if (!appSuffix) {
    return next();
  }
  if (req.url !== appSuffix) {
    req.url = req.url.replace(`${appSuffix}/`, '/');
  }

  next();
};

gulp.task('connect:dev', () => {
  const { appSuffix } = conf.getAppConfig();
  connect.server({
    root: [conf.paths.tmp, conf.paths.root],
    port: 3000,
    fallback: path.join(conf.paths.tmp, 'index.html'),
    middleware() {
      return [rewriteUrlWithSuffix(appSuffix)];
    },
  });
});

gulp.task('connect:dist', () => {
  const { appSuffix } = conf.getAppConfig();
  connect.server({
    root: [conf.paths.dist],
    port: 3000,
    fallback: path.join(conf.paths.dist, 'index.html'),
    middleware() {
      return [rewriteUrlWithSuffix(appSuffix)];
    },
  });
});
