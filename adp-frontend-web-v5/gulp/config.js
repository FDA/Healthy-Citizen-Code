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
    captchaDisabled: false,
    debug: false,
    apiPrefix: '',
    resourcePrefix: '',
  };

  const {
    SERVER_BASE_URL,
    API_URL,
    API_PREFIX,
    RESOURCE_PREFIX,
  } = process.env;

  const apiPrefix = API_PREFIX || configDefaults.apiPrefix;
  const resourcePrefix = RESOURCE_PREFIX || configDefaults.resourcePrefix;
  const serverBaseUrl = SERVER_BASE_URL || API_URL;

  const apiUrl = `${serverBaseUrl}${apiPrefix}`;
  const resourceUrl = `${serverBaseUrl}${resourcePrefix}`;
  const envConfig = {
    resourceUrl,
    apiUrl,
    apiPrefix,
    resourcePrefix,
    serverBaseUrl,
    captchaDisabled: process.env.CAPTCHA_DISABLED === 'true',
    debug: process.env.DEBUG === 'true',
    reCaptchaKey: process.env.RECAPTCHA_KEY,
    googleApiKey: process.env.GOOGLE_API_KEY
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
  appModelCodePath: 'app-model-code.js',
  polyfillsScripts: 'polyfills-generated.js',
  clientModulesFolder: 'client-modules',
  index: 'index.html',
  tasks: 'gulp/tasks',
  acePath: 'lib/ace-builds/src-noconflict',
};

exports.endpoints = {
  model: 'app-model',
  appModelCode: 'app-model-code.js',
  clientModules: 'public/js/client-modules',
  serverCss: 'public/css/style.css',
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
