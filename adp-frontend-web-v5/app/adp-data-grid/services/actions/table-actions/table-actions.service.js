;(function () {
  'use strict';
  var ROW_POSITION_SIGNATURE = "grid.row";

  angular
    .module('app.adpDataGrid')
    .factory('GridTableActions', GridTableActions);

  /** @ngInject */
  function GridTableActions(
    GridActionsTemplate
  ) {
    return function (options, schema, customGridOptions) {
      var tableActions = _.pickBy(schema.actions.fields, function (action) {
        // ToDo: ShowInTable is deprecated so here for compatibility reasons only
        return _.startsWith(action.position, ROW_POSITION_SIGNATURE) || _.get(action, 'showInTable', true);
      });

      if (actionsIsEmpty(tableActions)) {
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

    function actionsIsEmpty(actions) {
      var actionNames = _.keys(actions);
      var hasOnlyViewsKey = actionNames.length === 0 && actionNames[0] === 'view';
      return _.isEmpty(actions) || hasOnlyViewsKey;
    }
  }
})();
