(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldLookupMultiple', adpFormFieldLookupMultiple);

  function adpFormFieldLookupMultiple(CONSTANTS) {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-lookup-multiple/adp-form-field-lookup-multiple.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.field = scope.adpField;

        scope.adpFormData[scope.field.keyName] = scope.adpFormData[scope.field.keyName] || [];

        scope.form = formCtrl;
        scope.uiProps = scope.adpFieldUiProps;

        scope.options = {
          multiple: true,
          nextSearchTerm: function (selected) {
            if (selected && selected.length) {
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
          onChange: function(e) {
            var indexOfRemoved;
            if (e.added) {
              if (_.isUndefined(scope.adpFormData[scope.field.keyName + '_label'])) {
                scope.adpFormData[scope.field.keyName + '_label'] = [];
              }
              scope.adpFormData[scope.field.keyName + '_label'].push(e.added.label);
            }

            if (e.removed) {
              indexOfRemoved = scope.adpFormData[scope.field.keyName + '_label'].indexOf(e.removed.label);
              scope.adpFormData[scope.field.keyName + '_label'].splice(indexOfRemoved, 1);
            }

            scope.$apply();
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
            if (!scope.adpFormData[scope.field.keyName]) return;

            var data = scope.adpFormData[scope.field.keyName].map(function (id, index) {
              return {
                id: id,
                label: scope.adpFormData[scope.field.keyName + '_label'][index]
              }
            });

            callback(data);
          }
        };
      }
    }
  }
})();
