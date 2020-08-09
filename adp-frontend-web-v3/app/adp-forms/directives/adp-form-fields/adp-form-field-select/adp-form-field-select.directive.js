(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormFieldSelect', adpFormFieldSelect);

  function adpFormFieldSelect(
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
      templateUrl: 'app/adp-forms/directives/adp-form-fields/adp-form-field-select/adp-form-field-select.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.field = scope.adpField;
        var initialValue = isEmpty() ? '' : getData().toString();
        setData(initialValue);

        scope.form = formCtrl;
        scope.uiProps = scope.adpFieldUiProps;

        scope.listOfValues = AdpFieldsService.getListOfOptions(scope.field.list);

        scope.options = {
          formatResult: AdpFieldFormatUtil.formatSelectLabel,
          formatSelection: AdpFieldFormatUtil.formatSelectSelection
        };

        // hiding search input
        // https://github.com/select2/select2/issues/489#issuecomment-100602293
        if (scope.listOfValues.length < 10) {
          scope.options.minimumResultsForSearch = -1;
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
