const gulp = require('gulp');
const path = require('path');
const filter = require('gulp-filter');
const sourcemaps = require('gulp-sourcemaps');
const useref = require('gulp-useref');
const lazypipe = require('lazypipe');
const ngAnnotate = require('gulp-ng-annotate');
const uglify = require('gulp-uglify');
const uglifySaveLicense = require('uglify-save-license');
const cssnano = require('gulp-cssnano');
const rev = require('gulp-rev');
const revReplace = require('gulp-rev-replace');
const htmlmin = require('gulp-htmlmin');
const strip = require('gulp-strip-comments');

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
    output: { max_line_len: Infinity },
  })
  .on('error', conf.errorHandler('Uglify'));

  return gulp.src(path.join(conf.paths.tmp, conf.paths.index))
    .pipe(useref({searchPath: ['.tmp', './']}, lazypipe().pipe(sourcemaps.init, {loadMaps: true})))

    .pipe(jsFilter)
    .pipe(ngAnnotate())
    .pipe(uglifyStream)
    .pipe(rev())
    .pipe(jsFilter.restore)

    .pipe(cssFilter)
    .pipe(cssnano())
    .pipe(rev())
    .pipe(cssFilter.restore)

    .pipe(revReplace())
    .pipe(sourcemaps.write('maps'))
    .pipe(htmlFilter)
    .pipe(strip())
    .pipe(htmlmin())
    .pipe(htmlFilter.restore)
    .pipe(gulp.dest(conf.paths.distTmp));
}