;(function () {
  'use strict';

  function getExistingModules(names) {
    if (!names.length) return [];

    var modules = [];

    _.each(names, function (moduleName) {
      try {
        if (angular.module(moduleName)) {
          modules.push(moduleName);
        }
      } catch(err) {}
    });

    return modules;
  }

  var deps = [
    'ngSanitize',
    'ui.router',
    'ui.bootstrap',
    'ngMap',

    // Smartadmin Angular Common Module
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
  ];

  deps = deps.concat(getExistingModules(['app.clientModules', 'app.defaultClientModules']));
  /**
   * @ngdoc overview
   * @name app [smartadminApp]
   * @description
   * # app [smartadminApp]
   *
   * Main module of the application.
   */
  angular.module('app', deps);
})();
