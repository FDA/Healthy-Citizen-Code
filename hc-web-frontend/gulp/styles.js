'use strict';

var path = require('path');
var gulp = require('gulp');
var conf = require('./conf');
var copy = require('mosaic-gulp-task-copy');

var browserSync = require('browser-sync');

var $ = require('gulp-load-plugins')();

var wiredep = require('wiredep').stream;
var _ = require('lodash');

gulp.task('styles-reload', ['styles'], function ()
{
    return buildStyles()
        .pipe(browserSync.stream());
});

gulp.task('styles', ['misc'], function ()
{
    return buildStyles();
});


// Copy select2 vendor files from bower components to the public folder
gulp.task('misc', copy([
    {
        src: 'bower_components/select2/*.{png,gif}',
        dest: 'dist/styles'
    }
]));

var buildStyles = function ()
{
    var sassOptions = {
        style: 'expanded'
    };

    var injectFiles = gulp.src([
        path.join(conf.paths.src, '/app/core/scss/**/*.scss'),
        path.join(conf.paths.src, '/app/core/**/*.scss'),
        path.join(conf.paths.src, '/app/**/*.scss'),
        path.join('!' + conf.paths.src, '/app/main/components/material-docs/demo-partials/**/*.scss'),
        path.join('!' + conf.paths.src, '/app/core/scss/partials/**/*.scss'),
        path.join('!' + conf.paths.src, '/app/index.scss')
    ], {read: false});

    var injectOptions = {
        transform   : function (filePath)
        {
            filePath = filePath.replace(conf.paths.src + '/app/', '');
            return '@import "' + filePath + '";';
        },
        starttag    : '// injector',
        endtag      : '// endinjector',
        addRootSlash: false
    };

    return gulp.src([
            path.join(conf.paths.src, '/app/index.scss')
        ])
        .pipe($.inject(injectFiles, injectOptions))
        .pipe(wiredep(_.extend({}, conf.wiredep)))
        .pipe($.sourcemaps.init())
        .pipe($.sass(sassOptions)).on('error', conf.errorHandler('Sass'))
        .pipe($.autoprefixer()).on('error', conf.errorHandler('Autoprefixer'))
        .pipe($.sourcemaps.write())
        .pipe(gulp.dest(path.join(conf.paths.tmp, '/serve/app/')));
};