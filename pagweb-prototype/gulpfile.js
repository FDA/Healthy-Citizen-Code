const gulp = require('gulp');
const replace = require('gulp-replace');
const rename = require('gulp-rename');

const GULP_CONFIG = {
    sourcePath: './public/js/client-modules/module.js.template',
    destPath: 'public/js/client-modules/module.js'
};

gulp.task('inject', interpolateConfig);
gulp.task('default', gulp.series('inject'));

function interpolateConfig() {
    const APP_CONFIG = require('./config.json');
    const regex = /<!--\s+?(.+)\s+?-->/g;

    return gulp.src(GULP_CONFIG.sourcePath)
        .pipe(replace(regex, (_fullMatch, configKey) => APP_CONFIG[configKey]))
        .pipe(rename(GULP_CONFIG.destPath))
        .pipe(gulp.dest('.'));
}
