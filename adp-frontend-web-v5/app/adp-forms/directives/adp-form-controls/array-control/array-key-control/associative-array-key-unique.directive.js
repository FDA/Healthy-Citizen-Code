(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('associativeArrayKeyUnique', associativeArrayKeyUnique);

  function associativeArrayKeyUnique() {
    return {
      restrict: 'A',
      require: ['ngModel', '^^form'],
      link: function (scope, el, attrs, ctrls) {
        var ctrl = ctrls[0];
        var angularForm = ctrls[1];

        ctrl.$validators.associativeArrayKeyUnique = function (value) {
          if (_.isNil(value) || value === '') {
            return true;
          }

          var arrayKeys = getArrayKeys(angularForm);
          var sameKeys = _.filter(arrayKeys, function (key) {
            return value === key;
          });

          return sameKeys.length <= 1;
        };

        function getArrayKeys(angularForm) {
          var isForm = function (c) { return !!c.$$controls; };
          var getKeyVal = function (c) { return c.$key.$viewValue; };

          var associativeArrayKeys = angularForm.$$parentForm.$getControls()
            .filter(isForm)
            .map(getKeyVal);

          return _.compact(associativeArrayKeys);
        }

      }
    }
  }
})();
