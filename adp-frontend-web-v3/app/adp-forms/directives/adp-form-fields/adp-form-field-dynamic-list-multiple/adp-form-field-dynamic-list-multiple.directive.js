(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldDynamicListMultiple', adpFormFieldDynamicListMultiple);

  function adpFormFieldDynamicListMultiple(
    AdpFieldsService,
    AdpFieldFormatUtil
  ) {
    return {
      restrict: 'E',
      scope: {
        adpField: '=',
        adpFormData: '=',
        adpFieldUiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-dynamic-list-multiple/adp-form-field-dynamic-list-multiple.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.field = scope.adpField;
        scope.loading = true;

        scope.adpFormData[scope.field.keyName] = scope.adpFormData[scope.field.keyName] || [];

        scope.form = formCtrl;
        scope.uiProps = scope.adpFieldUiProps;

        AdpFieldsService.getListOptionsAsync(scope.field.list)
          .then(init);

        function init(list) {
          scope.listOfValues = list;
          scope.loading = false;

          scope.options = {
            formatResult: AdpFieldFormatUtil.formatSelectLabel,
            formatSelection: AdpFieldFormatUtil.formatSelectSelection,
            onChange: function(e) {
              var addedLabel = e.added && JSON.parse(e.added.text.trim()).label;
              var removedLabel = e.removed && JSON.parse(e.removed.text.trim()).label;
              var indexOfRemoved;

              if (addedLabel) {
                if (_.isUndefined(scope.adpFormData[scope.field.keyName + '_label'])) {
                  scope.adpFormData[scope.field.keyName + '_label'] = [];
                }
                scope.adpFormData[scope.field.keyName + '_label'].push(addedLabel);
              }

              if (removedLabel) {
                indexOfRemoved = scope.adpFormData[scope.field.keyName + '_label'].indexOf(removedLabel);
                scope.adpFormData[scope.field.keyName + '_label'].splice(indexOfRemoved, 1);
              }

              scope.$apply();
            },
          };
        }
      }
    }
  }
})();
