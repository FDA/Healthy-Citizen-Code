/**
 *  This file contains the variables used in other gulp files
 *  which defines tasks
 *  By design, we only put there very generic config values
 *  which are used in several places to keep good readability
 *  of the tasks
 */

const log = require('fancy-log');
const colors = require('ansi-colors');
const ms = require('ms');
const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');

function getAppConfig() {
  return JSON.parse(fs.readFileSync(path.resolve(exports.paths.buildAppConfig), 'utf8'));
}
exports.getAppConfig = getAppConfig;

async function buildAppConfig() {
  const envConfig = getEnvConfig();
  const serverConfig = await getServerConfig(envConfig);
  const runtimeConfig = _.merge({}, envConfig, serverConfig);

  const { apiBuildUrl, resourceUrl, resourcePrefix, apiPrefix, appSuffix } = runtimeConfig;
  const buildConfig = {
    apiBuildUrl: `${apiBuildUrl}${apiPrefix}`,
    buildResourceUrl: `${apiBuildUrl}${resourcePrefix}`,
    resourceUrl, appSuffix,
  };

  return { runtimeConfig, buildConfig };
}
exports.buildAppConfig = buildAppConfig;

function getEnvConfig() {
  const argv = require('minimist')(process.argv.slice(2));
  const API_BUILD_URL = argv.API_BUILD_URL || process.env.API_BUILD_URL;
  const { RESOURCE_PREFIX, API_PREFIX } = process.env;

  const { SHOW_CLS_CSR_IN_USER_MENU, REMOVE_TEST_ATTRIBUTES, DEBUG, ALLOW_PERFORMANCE_MONITOR } = process.env;

  return {
    apiBuildUrl: API_BUILD_URL,
    apiPrefix: API_PREFIX || '',
    resourcePrefix: RESOURCE_PREFIX || '',
    showClsCsrInUserMenu: SHOW_CLS_CSR_IN_USER_MENU ? SHOW_CLS_CSR_IN_USER_MENU === 'true' : true,
    removeTestAttributes: REMOVE_TEST_ATTRIBUTES === 'true',
    debug: DEBUG === 'true',
    allowPerformanceMonitor: ALLOW_PERFORMANCE_MONITOR === 'true',
  };
}
exports.getEnvConfig = getEnvConfig;

async function getServerConfig({ apiBuildUrl, apiPrefix, resourcePrefix }) {
  const requestPromise = require('./utils/request-promise');
  const response = await requestPromise({
    url: `${apiBuildUrl}${apiPrefix}/build-app-model`,
    method: 'GET',
    json: true,
  });

  const { config } = response.data.frontend;

  const { API_URL, APP_SUFFIX } = config;
  return {
    // Frontend's apiUrl is the full url to the backend (considering proxy, etc.) unlike backend's API_URL which is the root url
    // serverBaseUrl is needed for socket.io connection
    serverBaseUrl: API_URL,
    appSuffix: APP_SUFFIX,
    apiUrl: `${API_URL}${APP_SUFFIX}${apiPrefix}`,
    resourceUrl: `${API_URL}${APP_SUFFIX}${resourcePrefix}`,
    inactivityLogoutPollingInterval: ms(config.INACTIVITY_LOGOUT_POLLING_INTERVAL || '5s'),
    inactivityLogoutNotificationAppearsFromSessionEnd: config.INACTIVITY_LOGOUT_NOTIFICATION_APPEARS_IN
      ? config.INACTIVITY_LOGOUT_IN - config.INACTIVITY_LOGOUT_NOTIFICATION_APPEARS_IN
      : 0,
    inactivityLogoutFePingInterval: config.INACTIVITY_LOGOUT_FE_PING_INTERVAL,
    isInactivityLogoutEnabled: config.INACTIVITY_LOGOUT_IN > 0,
    dataExportInstantDownloadTimeout: config.DATA_EXPORT_INSTANT_DOWNLOAD_TIMEOUT || 3000,
    hideErrorMessagesAfterLogoutIn: config.HIDE_ERROR_MESSAGES_AFTER_LOGOUT_IN,
    jwtAccessTokenRefreshBeforeExpire: ms(config.JWT_ACCESS_TOKEN_REFRESH_BEFORE_EXPIRE || '30s'),
    captchaDisabled: config.CAPTCHA_DISABLED,
    reCaptchaKey: config.RECAPTCHA_KEY,
    googleApiKey: config.GOOGLE_API_KEY,
  };
}

exports.ngModule = 'app';

/**
 *  The main paths of your project handle these with care
 */
exports.paths = (() => ({
  root: '.',
  src: 'app',
  dist: 'build',
  distTmp: 'build-tmp',
  assets: 'assets',
  tmp: '.tmp',
  buildAppConfig: '.tmp/build-app-config.json',
  serverCss: 'model-style.less',
  appModelCodePath: 'app-model-code.js',
  polyfillsScripts: 'polyfills-generated.js',
  clientModulesFolder: 'client-modules',
  index: 'index.html',
  tasks: 'gulp/tasks',
  acePath: 'lib/ace-builds/src-noconflict',
}))();

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
  ignoreCustomFragments: [/{{.*?}}/],
};

exports.removeAttrs = [/^ng-attr-adp-qaid/, /^adp-qaid/];

/**
 *  Common implementation for an error handler of a Gulp plugin
 */
exports.errorHandler = function (title) {
  return (err) => {
    log(colors.red(`[${title}]`), err.toString());
    this.emit('end');
  };
};

exports.moduleDir = 'node_modules';
