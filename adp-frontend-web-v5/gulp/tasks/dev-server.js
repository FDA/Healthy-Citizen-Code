const gulp = require('gulp');
const connect = require('gulp-connect');
const conf = require('../config');
const path = require('path');


gulp.task('connect:dev', function () {
  connect.server({
    root: [conf.paths.tmp, conf.paths.root],
    port: 3000,
    fallback: path.join(conf.paths.tmp, 'index.html'),
  });
});

gulp.task('connect:dist', function () {
  connect.server({
    root: [conf.paths.dist],
    port: 3000,
    fallback: path.join(conf.paths.dist, 'index.html'),
  });
});
