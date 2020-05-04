;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpAutocomplete', adpAutocomplete);

  function adpAutocomplete(
    AdpFieldsService
  ) {
    return {
      restrict: 'A',
      scope: false,
      link: function (scope, element, attrs) {
        var unbind = scope.$watch(attrs.adpAutocomplete, function(field) {
          element[0].autocomplete = AdpFieldsService.autocompleteValue(field);
          unbind();
        });
      }
    }
  }
})();
