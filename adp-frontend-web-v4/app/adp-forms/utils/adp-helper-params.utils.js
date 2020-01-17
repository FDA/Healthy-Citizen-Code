;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpFormHelpers', AdpFormHelpers);

  function AdpFormHelpers(
    AdpPath,
    APP_CONFIG
  ) {
    function getHelperParams(path, formData, action, schema) {
      var schemaPath = AdpPath.schemaPath(path);

      var params = {
        data: _.get(formData, path, null),
        row: formData,
        modelSchema: _.get(schema.fields, schemaPath, null),
        action: action,

        parentData: _getParentData(path, formData),
        path: path,
        index: _getItemIndex(path),
        indexes: _getItemIndexes(path),
      };

      return params;
    }

    function getHelperParamsWithConfig(path, formData, action, schema) {
      var params = getHelperParams(path, formData, action, schema);
      params.config = _.cloneDeep(APP_CONFIG);

      return params;
    }

    function _getParentData(path, formData) {
      var parentPath = AdpPath.parent(path);
      var data =_.get(formData, parentPath, null);

      return data;
    }

    function _getItemIndexes(path) {
      var regex = /\[(\d+)\]/g;
      var matches = [];
      var match = regex.exec(path);

      while (!_.isNull(match)) {
        matches.push(match[1]);
        match = regex.exec(path);
      }

      var indexes = matches.map(Number);

      return indexes.length > 0 ? indexes : null;
    }

    function _getItemIndex(path) {
      var indexes = _getItemIndexes(path);

      if (_.isNull(indexes)) {
        return null;
      }

      return _.last(indexes);
    }

    return {
      getHelperParams: getHelperParams,
      getHelperParamsWithConfig: getHelperParamsWithConfig
    }
  }
})();
