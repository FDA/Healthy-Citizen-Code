const gulp = require('gulp');
const path = require('path');
const htmlmin = require('gulp-htmlmin');
const angularTemplatecache = require('gulp-angular-templatecache');
const conf = require('../config');

gulp.task('partials', partials);

function partials() {
  return gulp.src(path.join(conf.paths.src, '/**/*.html'))
    .pipe(htmlmin(conf.htmlmin))
    .pipe(angularTemplatecache('templateCacheHtml.js', {
      module: conf.ngModule,
      root: 'app'
    }))
    .pipe(gulp.dest(conf.paths.tmp));
}
