;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpUnifiedArgs', AdpUnifiedArgs);

  function AdpUnifiedArgs(
    AdpPath,
    APP_CONFIG
  ) {
    /**
     *
     * @param options
     * @param options.path
     * @param options.formData
     * @param options.action
     * @param options.schema
     *
     * @return unified args
     */
    function getHelperParams(options) {
      var schemaPath = AdpPath.schemaPath(options.path);

      return {
        data: _.get(options.formData, options.path, null),
        row: options.formData,
        modelSchema: _.get(options.schema.fields, schemaPath, options.schema),
        action: options.action,

        parentData: _getParentData(options.path, options.formData),
        path: options.path,
        index: _getItemIndex(options.path),
        indexes: _getItemIndexes(options.path),
      };
    }

    /**
     *
     * @param options
     * @param options.path
     * @param options.formData
     * @param options.action
     * @param options.schema
     *
     * @return unified args
     */
    function getHelperParamsWithConfig(options) {
      var params = getHelperParams(options);
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
