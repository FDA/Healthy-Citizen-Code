(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpFormValidationRules', AdpFormValidationRules);

  function AdpFormValidationRules() {
    return {
      associativeArrayKeyUnique: function (value, schemaField, formData, angularForm) {
        if (_.isNil(value) || value === '') {
          return true;
        }

        var arrayKeys = getArrayKeys(angularForm);
        var sameKeys = _.filter(arrayKeys, function (key) {
          return value === key;
        });

        return sameKeys.length <= 1;
      },
      schemaKeyRegExp: function (value) {
        var keyRegex = /^[_a-zA-Z][_a-zA-Z0-9]*$/;
        return keyRegex.test(value);
      }
    }

    function getArrayKeys(angularForm) {
      var arrayFormControls = _.get(angularForm, '$$parentForm.$$controls', []);
      var reTpl = ['^', angularForm.$name, '$'].join('')
        .replace(/\[(\d+)\]/, '\\[\\d+\\]');
      var arrayFormNameRegexp = new RegExp(reTpl);

      var keys = arrayFormControls.map(function (control) {
        var isArrayForm = arrayFormNameRegexp.test(control.$name);
        if (!isArrayForm) {
          return;
        }


        return control.$key.$viewValue;
      });

      return _.compact(keys);
    }

  }
})();
