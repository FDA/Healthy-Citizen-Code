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
        fieldSchema: _.get(options.schema.fields, schemaPath, options.schema),
        modelSchema: options.schema,
        appSchema: window.adpAppStore.appModel(),
        action: options.action,

        parentData: _getParentData(options.path, options.formData),

        path: options.path,
        schemaPath: schemaPath,
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

    /**
     *
     * @param args - unified args
     * @param fieldName
     * @param [index]
     * @return {{path, appSchema: *, data: *, indexes, parentData, schemaPath, fieldSchema: *, action, index, row: *, modelSchema: *}}
     */
    function next(args, fieldName, index) {
      var fn = _.isNil(args.config) ? getHelperParams : getHelperParamsWithConfig;

      return fn({
        path: AdpPath.next(args.path, fieldName, index),
        formData: args.row,
        action: args.action,
        schema: args.modelSchema,
      });
    }

    function _getParentData(path, formData) {
      var parentPath = AdpPath.parent(path);
      return _.get(formData, parentPath, formData);
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
      getHelperParamsWithConfig: getHelperParamsWithConfig,
      next: next,
    }
  }
})();
