;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('visibilityUtils', visibilityUtils);

  function visibilityUtils() {
    function arrayHasVisibleChild(args, formContext) {
      var arrayData = _.get(args.row, args.path);
      if (!_.isArray(arrayData)) {
        return false;
      }

      var found = _.find(formContext.visibilityMap, function (visibility, arrayItemPath) {
        return isArrayItem(args.path, arrayItemPath) ? visibility : false;
      });

      return !!found;
    }

    function isArrayItem(currentArrayPath, arrayPathToCompare) {
      var re = new RegExp('^' + _.escapeRegExp(currentArrayPath) + '\\[\\d+\\]$');
      return re.test(arrayPathToCompare);
    }

    return {
      arrayHasVisibleChild: arrayHasVisibleChild
    };
  }
})();
