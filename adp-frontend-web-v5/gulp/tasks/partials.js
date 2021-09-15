const gulp = require('gulp');
const path = require('path');
const posthtml = require('gulp-posthtml');
const posthtmlMin = require('posthtml-minifier');
const angularTemplateCache = require('gulp-angular-templatecache');
const removeAttributes = require('../lib/remove-attrs');
const conf = require('../config');

gulp.task('partials', partials);

function partials() {
  const plugins = [posthtmlMin(conf.htmlmin)];
  const { removeTestAttributes } = conf.getAppConfig();
  if (removeTestAttributes) {
    plugins.push(removeAttributes(conf.removeAttrs));
  }

  return gulp
    .src(path.join(conf.paths.src, '/**/*.html'))
    .pipe(posthtml(plugins))
    .pipe(
      angularTemplateCache('templateCacheHtml.js', {
        module: conf.ngModule,
        root: 'app',
      })
    )
    .pipe(gulp.dest(conf.paths.tmp));
}
