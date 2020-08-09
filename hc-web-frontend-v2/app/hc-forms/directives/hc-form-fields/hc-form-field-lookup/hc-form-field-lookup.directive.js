(function () {
  'use strict';

  angular
    .module('app.hcForms')
    .directive('hcFormFieldLookup', hcFormFieldLookup);

  function hcFormFieldLookup(CONSTANTS) {
    return {
      restrict: 'E',
      scope: {
        hcField: '=',
        hcFormData: '=',
        hcFieldUiProps: '='
      },
      templateUrl: 'app/hc-forms/directives/hc-form-fields/hc-form-field-lookup/hc-form-field-lookup.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.field = scope.hcField;

        scope.hcFormData[scope.field.keyName] = scope.hcFormData[scope.field.keyName] || '';

        scope.form = formCtrl;
        scope.uiProps = scope.hcFieldUiProps;

        scope.options = {
          nextSearchTerm: function (selected) {
            if (selected && selected.label) {
              return selected.label;
            }

            return '';
          },
          formatResult: function(state) {
            return state.label;
          },
          formatSelection: function(state) {
            return state.label;
          },
          ajax: {
            url: CONSTANTS.apiUrl + '/lookups/' + scope.field.lookup.id,
            dataType: 'json',
            quietMillis: 300,
            data: function (term, page) {
              return { q: term, page: page };
            },
            results: function (response) {
              return { results: response.data, more: response.more };
            },
            cache: true
          },
          initSelection: function (element, callback) {
            if (!scope.hcFormData[scope.field.keyName]) return;
            var id = scope.hcFormData[scope.field.keyName],
                label = scope.hcFormData[scope.field.keyName + '_label'];

            callback({
                id: id,
                label: label
            });
          }
        };
      }
    }
  }
})();
