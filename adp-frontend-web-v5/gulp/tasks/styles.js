const gulp = require('gulp');
const path = require('path');
const sourcemaps = require('gulp-sourcemaps');
const less = require('gulp-less');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const plumber = require('gulp-plumber');

const conf = require('../config');

gulp.task('styles', styles);

function styles() {
  return gulp
    .src(path.join(conf.paths.assets, '/less/index.less'))
    .pipe(
      plumber(function (err) {
        console.log('========= Styles task error: ', err);
        this.emit('end');
      })
    )
    .pipe(sourcemaps.init())
    .pipe(less({ compress: false }))
    .pipe(postcss([autoprefixer()]))
    .pipe(sourcemaps.write(path.join('../maps')))
    .pipe(gulp.dest(path.join(conf.paths.tmp, '/styles')));
}
