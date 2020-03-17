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
  .config(onConfig)
  .config(addRoutes)

  function onConfig (AppGeneratorProvider) {
    AppGeneratorProvider.generateApp();
  }

  function addRoutes($stateProvider) {
    $stateProvider
      .state('app.datasetById', {
        url: '/datasets/{_id:[0-9A-Fa-f]{24}}',
        views: {
          content: {
            templateUrl: 'app/adp-generator/views/datasets.html',
            controller: 'DatasetController as vm'
          }
        },
        data: {
          title: 'Datasets',
          redirectStrategy: 'user'
        }
      })
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
