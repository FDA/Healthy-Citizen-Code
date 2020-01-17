;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('ComplexTypesCellRenderer', ComplexTypesCellRenderer);

  /** @ngInject */
  function ComplexTypesCellRenderer(
    FormattersHelper,
    ComplexTypesMapper,
    MixedTypeCellRenderer,
    TreeSelectorCellRenderer,
    TreeView
  ) {
    return function (args, CellRenderer) {
      var data = mapDataToTreeView(args, CellRenderer);

      return TreeView.create(data, {asText: FormattersHelper.asText(args)});
    }

    function mapDataToTreeView(args, CellRenderer) {
      var builder = {
        object: function (args) {
          return treeViewNode(args.modelSchema.fieldName, args.data);
        },

        array: function (args) {
          return treeViewNode(args.modelSchema.fieldName, args.data);
        },

        arrayItem: function (itemValue, index) {
          return {
            text: index,
            items: itemValue.items,
          };
        },

        leaf: function (args) {
          if (args.modelSchema.type === 'Mixed') {
            return {
              text: args.modelSchema.fullName,
              items: MixedTypeCellRenderer.treeViewData(args).items,
            }
          } else if (args.modelSchema.type === 'TreeSelector') {
            return {
              text: args.modelSchema.fullName,
              items: TreeSelectorCellRenderer.treeViewData(args.data).items,
            }
          } else {
            var formatter = CellRenderer(args);
            var asText = FormattersHelper.asText(args);

            var val = [
              asText ? args.modelSchema.fullName : '<strong>' + args.modelSchema.fullName + '</strong>',
              formatter(args),
            ].join(': ');

            return { text: val };
          }
        },
      };

      return ComplexTypesMapper(args, builder);
    }

    function treeViewNode(name, items) {
      return {
        text: name,
        items: items,
      }
    }
  }
})();
