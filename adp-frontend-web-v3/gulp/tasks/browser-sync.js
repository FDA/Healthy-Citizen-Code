const gulp = require('gulp');
const browserSync = require('browser-sync');
const spa = require('browser-sync-spa');

const conf = require('../config');

browserSync.use(spa());

gulp.task('browsersync', browserSyncServe);

function browserSyncServe(done) {
  browserSync.init(conf.browserSync);
  done();
}

gulp.task('browsersync:dist', browserSyncDist);

function browserSyncDist(done) {
  browserSync.init(conf.browserSyncDist);
  done();
}