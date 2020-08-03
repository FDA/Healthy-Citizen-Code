const gulp = require('gulp');
const path = require('path');
const HubRegistry = require('gulp-hub');
const conf = require('./gulp/config');

require('dotenv').config();


// Load some files into the registry
const hub = new HubRegistry([path.join(conf.paths.tasks, '*.js')]);

// Load tasks
gulp.registry(hub);

// root level tasks
gulp.task('serve', gulp.series('tmp', 'other:serve', 'connect:dev'));
gulp.task('build', gulp.series(
  'tmp',
  'dist',
  'other:serve',
  'other:dist',
  'clean:dist',
  'mv:dist',
  'service-worker'
));
gulp.task('default', gulp.series('serve'));


gulp.task('inject:main', gulp.series('sw:replace', 'clientModules:replace', 'inject', 'html:replace'));
gulp.task('load:resources', gulp.parallel(
  'create:config',
  'prepare:polyfills',
  'load:script',
  'load:modules',
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

gulp.task('other:serve',
  gulp.series(
    gulp.parallel(
      'cp:assets:serve',
      'cp:json:serve',
      'cp:img:serve',
      'cp:fonts:serve',
      'cp:ckeditor:serve',
      'cp:aceEditor:serve',
    ),
    gulp.parallel(
      'pythonEditorWorker',
      'relaxedJsonEditorWorker'
    )
  )
);

gulp.task('other:dist', gulp.parallel(
  'cp:assets:dist',
  'cp:json:dist',
  'cp:img:dist',
  'cp:fonts:dist',
  'cp:dxFonts:dist',
  'cp:dxIcons:dist',
  'cp:workers:dist',
  'cp:lib:dist'
));
