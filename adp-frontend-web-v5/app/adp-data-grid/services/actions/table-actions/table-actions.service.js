;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridTableActions', GridTableActions);

  /** @ngInject */
  function GridTableActions(
    GridActionsTemplate,
    ActionsHelpers
  ) {
    return function (options, schema, customGridOptions) {
      var tableActions = ActionsHelpers.pickTableActions(schema);

      if (ActionsHelpers.actionsIsEmpty(tableActions)) {
        return;
      }

      options.columns.push({
        caption: getColumnCaption(schema),
        name: 'actions',
        cssClass: 'actions-column',
        cellTemplate: actionsTemplate(tableActions, schema, customGridOptions),
        allowExporting: false,
        allowEditing: false,
        hidingPriority: schema.actions.responsivePriority,
        visible: true,
        showInColumnChooser: true,
      });
    }

    function getColumnCaption(schema) {
      var DEFAULT_COLUMN_CAPTION = 'Actions';
      return schema.actions.title || DEFAULT_COLUMN_CAPTION;
    }

    function actionsTemplate(tableActions, schema, customGridOptions) {
      return function (container, cellInfo) {
        var actionPermissionsForRecord = cellInfo.data._actions;

        var permittedActions = _.pickBy(tableActions, function (actionItem, name) {
          return _.get(actionPermissionsForRecord, name, false);
        });

        var template = GridActionsTemplate(permittedActions, cellInfo, schema, customGridOptions);
        container.append(template);
      }
    }
  }
})();
