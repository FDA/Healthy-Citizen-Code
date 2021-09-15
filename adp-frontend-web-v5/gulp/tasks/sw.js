const gulp = require('gulp');
const path = require('path');
const _ = require('lodash');
const gulpReplace = require('gulp-replace');
const { injectManifest } = require('workbox-build');
const conf = require('../config');

const swSrc = path.join('app', 'service-worker.js');
const swDest = path.join('build', 'service-worker.js');

gulp.task('sw:manifest', () =>
  injectManifest({
    swSrc,
    swDest,
    globDirectory: 'build',
    globPatterns: ['**/*.{html,js,json,css}', '**/*.{otf,svg,ttf,woff,woff2}', '**/*.{jpg,png,gif}'],
    globIgnores: ['workers/**/*', 'lib/**/*'],
    // vendors.js is > 2MB :(
    maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
  })
);

gulp.task('sw:inject-config', () => {
  const appConfig = conf.getAppConfig();
  return gulp
    .src(path.join(swDest), { base: './' })
    .pipe(gulpReplace(/<!-- (.+) -->/g, (_match, key) => appConfig[key]))
    .pipe(gulp.dest('./'));
});

gulp.task('service-worker', gulp.series('sw:manifest', 'sw:inject-config'));
