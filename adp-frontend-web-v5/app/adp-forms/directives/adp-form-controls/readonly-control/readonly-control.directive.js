(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('readonlyControl', readonlyControl);

  function readonlyControl(HtmlCellRenderer) {
    return {
      restrict: 'E',
      scope: {
        args: '<',
        formContext: '<',
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/readonly-control/readonly-control.html',
      require: '^^form',
      link: function (scope) {
        scope.template = HtmlCellRenderer(scope.args);
      }
    }
  }
})();
