(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldDynamicList', adpFormFieldDynamicList);

  function adpFormFieldDynamicList(
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
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-dynamic-list/adp-form-field-dynamic-list.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.field = scope.adpField;
        scope.form = formCtrl;
        scope.uiProps = scope.adpFieldUiProps;
        scope.loading = true;

        if (isEmpty()) {
          setData('');
        } else {
          setData(getData().toString())
        }

        AdpFieldsService.getListOptionsAsync(scope.field.list)
          .then(initSelect);

        function initSelect(list) {
          scope.listOfValues = list;
          scope.loading = false;

          scope.options = {
            formatResult: AdpFieldFormatUtil.formatSelectLabel,
            formatSelection: AdpFieldFormatUtil.formatSelectSelection,
            onChange: function(e) {
              var addedValue = JSON.parse(e.added.text.trim());
              scope.adpFormData[scope.field.keyName + '_label'] = addedValue.label;
              scope.$apply();
            },
          };

          // hiding search input
          // https://github.com/select2/select2/issues/489#issuecomment-100602293
          if (scope.listOfValues.length < 10) {
            scope.options.minimumResultsForSearch = -1;
          }
        }

        function isEmpty() {
          var data = getData();
          return _.isUndefined(data) || _.isNull(data);
        }

        function getData() {
          return scope.adpFormData[scope.field.keyName];
        }

        function setData(value) {
          return scope.adpFormData[scope.field.keyName] = value;
        }
      }
    }
  }
})();
