var gulp = require('gulp');
var gulpNgConfig = require('gulp-ng-config');
var gulpCopy = require('gulp-copy');
var replace = require('gulp-replace');
var runSequence = require('run-sequence');

var fs = require('fs');
var json = JSON.parse(fs.readFileSync('./api_config.json'));

gulp.task('set-config', function () {
    gulp.src('api_config.json')
    .pipe(gulpNgConfig('app.config' , {
        wrap: true
    }))
    .pipe(gulp.dest('./src/app'))
});

gulp.task('copy-config', function () {
    gulp.src('api_config.json')
    .pipe(gulpCopy('./src'));
});


gulp.task('replace', function () {
    var path = json.CONSTANTS.apiUrl;
    gulp.src('./dist/index.html')
    .pipe(replace(/(replace\s+src=\")(.+\/)(.+\.js)/g, '$1' + path + '$3'))   
    .pipe(gulp.dest('./dist'))
});

gulp.task('replace-serve', function () {
    var path = json.CONSTANTS.apiUrl;

    gulp.src('./.tmp/serve/index.html')
    .pipe(replace(/(replace src=\")(.+\/)(.+\.js)/g, '$1' + path + '$3'))
    .pipe(gulp.dest('./.tmp/serve'))
});

gulp.task('api-config', ['set-config', 'copy-config', 'replace-serve', 'replace']);

gulp.task('api-config', function(callback) {
    runSequence(
        ['set-config', 'copy-config', 'replace-serve', 'replace'],
        'replace',
        'replace-serve',
        callback);
});