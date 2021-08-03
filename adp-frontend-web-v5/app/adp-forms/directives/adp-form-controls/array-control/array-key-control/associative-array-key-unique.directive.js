(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('associativeArrayKeyUnique', associativeArrayKeyUnique);

  function associativeArrayKeyUnique() {
    return {
      restrict: 'A',
      scope: false,
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
          var angularFormName = angularForm.$name.split(/\[(\d+)\]$/)[0];
          var reArrayPart = new RegExp(_.escapeRegExp(angularFormName) + '\\[\\d+\\]$');
          var isArrayPart = function (c) {
            return reArrayPart.test(c.$name);
          };

          var associativeArrayKeys = [];
          var parentFormControls = angularForm.$$parentForm.$getControls();
          parentFormControls.forEach(function (c) {
            if (isArrayPart(c)) {
              associativeArrayKeys.push(c.$key.$viewValue);
            }
          });

          return associativeArrayKeys;
        }

      }
    }
  }
})();
