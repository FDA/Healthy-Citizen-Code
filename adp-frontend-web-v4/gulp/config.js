'use strict';

/**
 *  This file contains the variables used in other gulp files
 *  which defines tasks
 *  By design, we only put there very generic config values
 *  which are used in several places to keep good readability
 *  of the tasks
 */

const gutil = require('gulp-util');

exports.ngModule = 'app';

/**
 *  The main paths of your project handle these with care
 */
exports.paths = {
  root: '.',
  src: 'app',
  dist: 'build',
  distTmp: 'build-tmp',
  assets: 'assets',
  tmp: '.tmp',
  serverCss: 'model-style.less',
  serverScripts: 'app-model-code.js',
  serverModules: 'client.module.js',
  defaultServerModules: 'default-module.js',
  index: 'index.html',
  tasks: 'gulp/tasks'
};

exports.endpoints = {
  model: 'app-model',
  scripts: 'app-model-code.js',
  serverModules: 'public/js/client-modules/module.js',
  serverCss: 'public/css/style.css',
  defaultServerModules: 'public/js/client-modules/default-module.js',
};

/**
 * used on gulp dist
 */
exports.htmlmin = {
  ignoreCustomFragments: [/{{.*?}}/]
};

/**
 *  Common implementation for an error handler of a Gulp plugin
 */
exports.errorHandler = function (title) {
  return err => {
    gutil.log(gutil.colors.red(`[${title}]`), err.toString());
    this.emit('end');
  };
};
/**
 *  Wiredep is the lib which inject bower dependencies in your project
 *  Mainly used to inject script tags in the index.html but also used
 *  to inject css preprocessor deps and js files in karma
 */
exports.wiredep = {
  directory: 'bower_components',
  fileTypes: {
    html: {
      replace: {
        js: '<script type="application/javascript" src="{{filePath}}"></script>',
      }
    }
  },
  exclude: [
    'bower_components/requirejs',
    'bower_components/jquery-1.11.0',
    'bower_components/lamejs',
    'bower_components/libvorbis.js',
    'bower_components/recorderjs'
  ]
};
