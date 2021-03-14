(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('staticHtmlControl', staticHtmlControl);

  function staticHtmlControl() {
    return {
      restrict: 'E',
      scope: {
        args: '<',
      },
      template: '',
      require: '^^form',
      link: function (scope, element) {
         element[0].innerHTML = _.get(scope, 'args.fieldSchema.template.link', '');
      }
    }
  }
})();
