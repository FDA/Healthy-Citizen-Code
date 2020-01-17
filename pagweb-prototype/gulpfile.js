const gulp = require('gulp');
const replace = require('gulp-replace');
const rename = require('gulp-rename');
require('dotenv').config();

const GULP_CONFIG = {
    sourcePath: './public/js/client-modules/module.js.template',
    destPath: 'public/js/client-modules/module.js'
};

gulp.task('inject', interpolateConfig);
gulp.task('default', gulp.series('inject'));

function interpolateConfig() {
  const APP_CONFIG = {
    "widgetUrl": process.env.WIDGET_URL,
    "hcResearchUrl": process.env.HC_RESEARCH_URL
  };

  if (!APP_CONFIG.widgetUrl || !APP_CONFIG.hcResearchUrl) {
    throw new Error('HC_RESEARCH_URL or WIDGET_URL are not specified in config.');
  }

    const regex = /<!--\s+?(.+)\s+?-->/g;

    return gulp.src(GULP_CONFIG.sourcePath)
        .pipe(replace(regex, (_fullMatch, configKey) => APP_CONFIG[configKey]))
        .pipe(rename(GULP_CONFIG.destPath))
        .pipe(gulp.dest('.'));
}
