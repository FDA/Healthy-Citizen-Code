const gulp = require('gulp');
const path = require('path');
const _ = require('lodash');
const filter = require('gulp-filter');
const sourcemaps = require('gulp-sourcemaps');
const useref = require('gulp-useref');
const lazypipe = require('lazypipe');
const ngAnnotate = require('gulp-ng-annotate');
const uglify = require('gulp-uglify');
const uglifySaveLicense = require('uglify-save-license');
const gulpReplace = require('gulp-replace');
const postcss = require('gulp-postcss');
const cssnano = require('cssnano');

const posthtml = require('gulp-posthtml');
const posthtmlMin = require('posthtml-minifier');
const removeAttributes = require('../lib/remove-attrs');

const strip = require('gulp-strip-comments');

const fsCache = require('gulp-fs-cache');
const conf = require('../config');

gulp.task('dist', build);

function build() {
  const jsFilter = filter([
    path.join(conf.paths.tmp, '**/*.js'),
    path.join(conf.paths.src, '**/*.js'),
  ], {restore: true});

  const htmlFilter = filter([path.join(conf.paths.tmp, '**/*.html')], {restore: true});
  const cssFilter = filter([path.join(conf.paths.tmp, '**/*.css')], {restore: true});

  const uglifyStream = uglify({
    preserveComments: uglifySaveLicense,
    mangle: false,
    output: { max_line_len: Infinity },
  })
  .on('error', conf.errorHandler('Uglify'));

  const jsFsCache = fsCache('.jscache');

  const posthtmlPlugins = [posthtmlMin(conf.htmlmin)];
  if (conf.APP_CONFIG().removeTestAttributes) {
    posthtmlPlugins.push(removeAttributes(conf.removeAttrs));
  }

  return gulp.src(path.join(conf.paths.tmp, conf.paths.index))
    .pipe(useref({searchPath: ['.tmp', './']}, lazypipe().pipe(sourcemaps.init, {loadMaps: true})))
    .pipe(jsFilter)
    .pipe(ngAnnotate())
    .pipe(jsFsCache)
    .pipe(uglifyStream)
    .pipe(jsFsCache.restore)
    .pipe(jsFilter.restore)

    .pipe(cssFilter)
    .pipe(postcss([cssnano()]))
    .pipe(cssFilter.restore)

    .pipe(sourcemaps.write('maps'))
    .pipe(htmlFilter)
    .pipe(strip())
    .pipe(posthtml(posthtmlPlugins))
    .pipe(htmlFilter.restore)
    .pipe(gulpReplace(/<script.*?src="(.*?\.js)"/g, function (scriptPart, src) {
      if (/^https?:/.test(src)) {
        return scriptPart;
      }

      const { appSuffix } = conf.APP_CONFIG();
      const suffix = !!appSuffix ? '/' + appSuffix : '';

      return `<script src="${suffix}${src}"`;
    }))
    .pipe(gulpReplace(/<link\srel="stylesheet".*?href="(.*?)"/g, function (scriptPart, src) {
      const { appSuffix } = conf.APP_CONFIG();
      const suffix = !!appSuffix ? '/' + appSuffix : '';
      return `<link rel="stylesheet" href="${suffix}${src}"`;
    }))
    .pipe(gulp.dest(conf.paths.distTmp));
}
