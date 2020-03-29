const gulp = require('gulp');
const path = require('path');
const filter = require('gulp-filter');
const sourcemaps = require('gulp-sourcemaps');
const useref = require('gulp-useref');
const lazypipe = require('lazypipe');
const ngAnnotate = require('gulp-ng-annotate');
const uglify = require('gulp-uglify');
const uglifySaveLicense = require('uglify-save-license');
const postcss = require('gulp-postcss');
const cssnano = require('cssnano');

const htmlmin = require('gulp-htmlmin');
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
    .pipe(htmlmin())
    .pipe(htmlFilter.restore)
    .pipe(gulp.dest(conf.paths.distTmp));
}
