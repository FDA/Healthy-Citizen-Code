(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldLookup', adpFormFieldLookup);

  function adpFormFieldLookup(CONSTANTS) {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-lookup/adp-form-field-lookup.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.field = scope.adpField;

        scope.adpFormData[scope.field.keyName] = scope.adpFormData[scope.field.keyName] || '';

        scope.form = formCtrl;
        scope.uiProps = scope.adpFieldUiProps;

        scope.options = {
          nextSearchTerm: function (selected) {
            if (selected && selected.label) {
              return selected.label;
            }

            return '';
          },
          formatResult: function(state) {
            // if option group
            if (!state.id) return state.text;

            return state.label;
          },
          formatSelection: function(state) {
            // if option group
            if (!state.id) return state.text;

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
          onChange: function(e) {
            scope.adpFormData[scope.field.keyName + '_label'] = [e.added.label];
            scope.$apply();
          },
          initSelection: function (element, callback) {
            if (!scope.adpFormData[scope.field.keyName]) return;
            var id = scope.adpFormData[scope.field.keyName],
                label = scope.adpFormData[scope.field.keyName + '_label'];

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
