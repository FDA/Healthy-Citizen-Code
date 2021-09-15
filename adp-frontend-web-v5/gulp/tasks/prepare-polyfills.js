const gulp = require('gulp');
const bufferToVinyl = require('buffer-to-vinyl');
const polyfillLibrary = require('polyfill-library');
const streamToPromise = require('stream-to-promise');
const conf = require('../config');

gulp.task('prepare:polyfills', () =>
  polyfillLibrary
    .getPolyfillString({
      minify: true,
      features: {
        es2015: {},
        es2016: {},
        es2017: {},
        es2018: {},
        'document.currentScript': {},
      },
    })
    .then((bundleString) =>
      streamToPromise(
        bufferToVinyl.stream(Buffer.from(bundleString), conf.paths.polyfillsScripts).pipe(gulp.dest(conf.paths.tmp))
      )
    )
);
