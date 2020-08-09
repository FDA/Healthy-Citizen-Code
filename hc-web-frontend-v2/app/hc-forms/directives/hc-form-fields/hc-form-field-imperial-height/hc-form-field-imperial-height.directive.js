(function () {
  'use strict';

  angular
    .module('app.hcForms')
    .directive('hcFormFieldImperialHeight', hcFormFieldImperialHeight);

  function hcFormFieldImperialHeight() {
    return {
      restrict: 'E',
      scope: {
        hcField: '=',
        hcFormData: '=',
        hcFieldUiProps: '='
      },
      templateUrl: 'app/hc-forms/directives/hc-form-fields/hc-form-field-imperial-height/hc-form-field-imperial-height.html',
      require: '^^form',
      link: function (scope, el, attrs, formCtrl) {
        scope.field = scope.hcField;
        scope.hcFormData[scope.field.keyName] = scope.hcFormData[scope.field.keyName] || [0, 0];
        scope.height = {
          foot: scope.hcFormData[scope.field.keyName][0],
          inch: scope.hcFormData[scope.field.keyName][1]
        };

        scope.form = formCtrl;
        scope.uiProps = scope.hcFieldUiProps;

        scope.validate = function () {
          scope.form[scope.field.keyName].$setDirty();
          scope.form[scope.field.keyName].$validate();
        };

        scope.foots = _.map(_.range(1, 9), function (i) {
          return { value: i, label: i + '\'' };
        });

        scope.inches = _.map(_.range(1, 12), function (i) {
          return { value: i, label: i + '\"' };
        });

        // hiding search input
        // https://github.com/select2/select2/issues/489#issuecomment-100602293
        scope.options = {
          minimumResultsForSearch: -1
        };

        scope.$watch('[height.foot, height.inch]', function () {
          scope.hcFormData[scope.field.keyName] = [
            parseInt(scope.height.foot),
            parseInt(scope.height.inch)
          ];
        });
      }
    }
  }
})();
