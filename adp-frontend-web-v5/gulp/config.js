'use strict';

/**
 *  This file contains the variables used in other gulp files
 *  which defines tasks
 *  By design, we only put there very generic config values
 *  which are used in several places to keep good readability
 *  of the tasks
 */

const log = require('fancy-log');
const colors = require('ansi-colors');

exports.APP_CONFIG = function() {
  const configDefaults = {
    "apiUrl": "http://localhost:5000",
    "captchaDisabled": false,
    "debug": false
  };

  var envConfig = {
    "apiUrl": process.env.API_URL,
    "captchaDisabled": process.env.CAPTCHA_DISABLED === 'true',
    "debug": process.env.DEBUG === 'true',
    "reCaptchaKey": process.env.RECAPTCHA_KEY,
    "googleApiKey": process.env.GOOGLE_API_KEY
  };

  return Object.assign(configDefaults, envConfig);
};

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
    log(colors.red(`[${title}]`), err.toString());
    this.emit('end');
  };
};

exports.moduleDir = 'node_modules';
