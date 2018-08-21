(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('selectControl', selectControl);

  function selectControl(
    AdpFieldsService,
    AdpFieldFormatUtil
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        fieldUiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/select-control/select-control.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
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
