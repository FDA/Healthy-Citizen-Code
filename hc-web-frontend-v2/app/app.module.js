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
    'ngAnimate',
    'ui.router',
    'ui.bootstrap',
    'LocalStorageModule',

    // Smartadmin Angular Common Module
    'SmartAdmin',

    // App
    'APP_MODEL_CONFIG',
    'app.hcLayout',
    'app.hcAuth',
    'app.hcGenerator',
    'app.hcCommon',
    'app.hcForms',
    'app.hcTables',
    'app.hcDashboard',
    'app.hcUi'
  ];

  deps = deps.concat(getExistingModules(['app.clientModules']));
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
