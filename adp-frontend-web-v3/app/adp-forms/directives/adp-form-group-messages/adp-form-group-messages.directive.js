;(function () {
  'use strict';

  angular
      .module('app.adpForms')
      .directive('adpFormGroupMessages', adpFormGroupMessages);

  function adpFormGroupMessages() {
    return {
      restrict: 'E',
      scope: {
        formGroup: '='
      },
      require: '^^form',
      templateUrl: 'app/adp-forms/directives/adp-form-group-messages/adp-form-group-messages.html'
    }
  }
})();
