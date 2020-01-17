;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpPath', AdpPath);

  function AdpPath() {
    function next(path, key, index) {
      var _path = _.isNil(index) ? path : path + '[' + index + ']';

      if (path) {
        return [_path, key].join('.');
      } else {
        return key;
      }
    }

    function schemaPath(dataPath) {
      return dataPath.replace(/\[\d+\]/g, '').split('.').join('.fields.');
    }

    /**
     * Get parent path from current
     * @param path
     *
     * Examples:
     * Arrays
     * a1[0].a2[0].a3[0].s3 => a1[0].a2[0].a3[0]
     * a1[0].a2[0].a3[0] => a1[0].a2[0]
     * a1[0].s1 => a1[0]
     *
     * Object
     * a1[0].o2.s3 => a1[0].o3
     *
     * @returns {String|null}
     */
    function parent(path) {
      if (_.isNull(path)) {
        return null;
      }

      var parentPath = _.dropRight(path.split('.'), 1);

      if (_.isEmpty(parentPath)) {
        return null;
      }

      parentPath[parentPath.length - 1] = _.last(parentPath).replace(/\[\d+\]/g, '');

      return parentPath.join('.');
    }


    return {
      next: next,
      parent: parent,
      schemaPath: schemaPath
    };
  }
})();
