;(function () {
  'use strict';

  /**
   * @ngdoc overview
   * @name app [smartadminApp]
   * @description
   * # app [smartadminApp]
   *
   * Main module of the application.
   */
  angular.module('app', [
    'ngSanitize',
    'ui.router',
    'ui.bootstrap',
    'ngMap',
    'SmartAdmin',

    // App
    'APP_MODEL_CONFIG',
    'app.adpLayout',
    'app.adpAuth',
    'app.adpGenerator',
    'app.adpCommon',
    'app.adpForms',
    'app.adpDashboard',
    'app.adpUi',
    'app.adpUploader',
    'app.adpRecorders',
  ]);
})();
