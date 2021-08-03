;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('ComplexTypesCellRenderer', ComplexTypesCellRenderer);

  /** @ngInject */
  function ComplexTypesCellRenderer(
    FormattersHelper,
    ComplexTypesDataTransformer
  ) {
    return function (args, CellRenderer) {
      var data = ComplexTypesDataTransformer(args, CellRenderer);

      return FormattersHelper.asText(args) ?
        getComplexTypeAsText(data, _.get(args, 'fieldSchema.fieldName')) :
        getComplexTypeAsYaml(data);
    }

    function getComplexTypeAsText(data, name) {
      var textValues = _.isObject(data) ? _.map(data, getComplexTypeAsText).join('; ') : '';
      var finalValue = _.isObject(data) && !textValues ? '{}' : data;

      return name + ': ' + (textValues ? '{ ' + textValues + ' }' : finalValue);
    }

    function getComplexTypeAsYaml(data) {
      var yaml = null;
      try {
        yaml = window.jsyaml.safeDump(data);
      } catch (e) {
        if (e instanceof window.jsyaml.YAMLException) {
          console.error('Error trying to format data to yaml: ', data, e);
        } else {
          throw e;
        }
      }

      return htmlContent(yaml);
    }

    function htmlContent(yaml) {
      var container = $('<div class="adp-grid-scroll-container">');
      container.append(yaml);

      return container;
    }
  }
})();
