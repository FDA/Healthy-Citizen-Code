var path = require('path');
var gulp = require('gulp');
var conf = require('./conf');
var es6transpiler = require('gulp-es6-transpiler');


gulp.task('compile-es6', function () {
    return gulp.src(path.join(conf.paths.src, '/app/**/*.js'))
        .pipe(es6transpiler())
        .pipe(gulp.dest('.tmp/serve/app'));
});
