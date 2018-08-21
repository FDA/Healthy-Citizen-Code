;(function () {
  'use strict';

angular
  .module('app.adpGenerator', [
    'ui.router',
    'app.adpAuth',
    'app.adpDashboard'
  ])
  .config(onConfig);

  function onConfig (AppGeneratorProvider) {
    AppGeneratorProvider.generateApp();
  }
})();
