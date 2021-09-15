;(function () {
  'use strict';

angular
  .module('app.adpGenerator', [
    'ui.router',
    'app.adpAuth',
    'app.adpDashboard',
    'app.adpDataGrid'
  ])
  .run(onRun)
  .config(onConfig);

  function onConfig (AppGeneratorProvider) {
    AppGeneratorProvider.generateApp();
  }

  function onRun($transitions, $uibModalStack) {
    $transitions.onStart(null, function (transition) {
      var toState = transition.to();
      var fromState = transition.from();
      if (toState.name === fromState.name) {
        return;
      }

      $uibModalStack.dismissAll('State transition');
    })
  }
})();
