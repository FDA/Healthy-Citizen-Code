;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('visibilityUtils', visibilityUtils);

  function visibilityUtils() {
    function arrayHasVisibleChild(arrayData, validationParams) {
      if (!_.isArray(arrayData)) {
        return false;
      }

      var visibilityMap = validationParams.formParams.visibilityMap;
      var path = validationParams.formParams.path;
      var found = _.find(visibilityMap, function (visibility, key) {
        var re = new RegExp('^' + _.escapeRegExp(path) + '\\[\\d+\\]$');
        var isArrayItem = re.test(key);

        return isArrayItem ? visibility : false;
      });

      return !!found;
    }

    return {
      arrayHasVisibleChild: arrayHasVisibleChild
    };
  }
})();
