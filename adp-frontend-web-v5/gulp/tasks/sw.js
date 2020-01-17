const gulp = require('gulp');
const path = require('path');
const _ = require('lodash');
const gulpReplace = require('gulp-replace');
const {injectManifest} = require('workbox-build');

const swSrc = path.join('app', 'service-worker.js');
const swDest = path.join('build', 'service-worker.js');

const APP_CONFIG = require('../config').APP_CONFIG();

gulp.task('sw:manifest', () => {
  return injectManifest({
    swSrc , swDest,
    globDirectory: 'build',
    globPatterns: [
      '**\/*.{html,js,json,css}',
      '**\/*.{otf,svg,ttf,woff,woff2}',
      '**\/*.{jpg,png,gif}'
    ],
    globIgnores: ['workers/**/*'],
    // vendors.js is > 2MB :(
    maximumFileSizeToCacheInBytes: 4 * 1024 * 1024
  });
});

gulp.task('sw:inject-config', () => {
  return gulp.src(path.join(swDest), { base: './' })
    .pipe(gulpReplace(/<!-- (.+) -->/g, (_match, key) => APP_CONFIG[key]))
    .pipe(gulp.dest('./'))
});

gulp.task('service-worker', gulp.series('sw:manifest', 'sw:inject-config'));