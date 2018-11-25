const gulp = require('gulp');
const path = require('path');
const HubRegistry = require('gulp-hub');
const browserSync = require('browser-sync');

const conf = require('./gulp/config');

// Load some files into the registry
const hub = new HubRegistry([path.join(conf.paths.tasks, '*.js')]);

// Load tasks
gulp.registry(hub);

gulp.task('inject:main', gulp.series('inject', 'html:replace'));
gulp.task('load:resources', gulp.parallel(
  'create:config',
  'load:script',
  'load:modules',
  'load:defaultModules',
  'load:css',
  'load:manifest'
  )
);

gulp.task(
  'tmp',
  gulp.series(
    'clean:tmp',
    gulp.series('load:resources', 'styles'),
    gulp.series('partials', 'inject:main')
  )
);
gulp.task('other:serve', gulp.parallel('cp:assets:serve', 'cp:json:serve', 'cp:img:serve', 'cp:fonts:serve'));
gulp.task('other:dist', gulp.parallel(
  'cp:assets:dist',
  'cp:assets:dist',
  'cp:json:dist',
  'cp:img:dist',
  'cp:fonts:dist',
  'cp:workers:dist'
));

gulp.task('serve', gulp.series('tmp', 'other:serve', 'watch', 'browsersync'));
gulp.task('build', gulp.series('tmp', 'dist', 'other:dist', 'clean:dist', 'mv:dist', 'service-worker'));
gulp.task('default', gulp.series('serve'));
gulp.task('watch', watch);

function reloadBrowserSync(cb) {
  browserSync.reload();
  cb();
}

function watch(done) {
  let indexPath = path.join(conf.paths.src, conf.paths.index);

  gulp.watch([indexPath, 'bower.json'], gulp.parallel('inject:main'));

  gulp.watch([path.join(conf.paths.assets, '/less/**/*.less')], gulp.series('styles'));

  gulp.watch(
    [path.join(conf.paths.src, '/**/*.html'), `!${indexPath}`],
    gulp.series('partials', reloadBrowserSync)
  );

  gulp.watch(path.join(conf.paths.src, '**/*.js'), gulp.series('inject:main'));

  done();
}
