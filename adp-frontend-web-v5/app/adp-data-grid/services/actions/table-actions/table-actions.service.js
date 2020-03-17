;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('GridTableActions', GridTableActions);

  /** @ngInject */
  function GridTableActions(
    ActionsHandlers,
    GridActionsTemplate,
    GridOptionsHelpers,
    AdpUnifiedArgs
  ) {
    return function (options, schema) {
      var tableActions = _.pickBy(schema.actions.fields, function (action) {
        return _.get(action, 'showInTable', true);
      });

      if (_.isEmpty(tableActions)) {
        return;
      }

      options.columns.push({
        caption: getColumnCaption(schema),
        name: 'actions',
        cssClass: 'actions-column',
        cellTemplate: actionsTemplate(tableActions),
        allowExporting: false,
        hidingPriority: schema.actions.responsivePriority,
        visible: true,
        showInColumnChooser: true,
      });

      options.onCellClick = handleActionInTable(schema);
    }

    function getColumnCaption(schema) {
      var DEFAULT_COLUMN_CAPTION = 'Actions';
      return schema.actions.title || DEFAULT_COLUMN_CAPTION;
    }

    function actionsTemplate(tableActions) {
      return function (container, cellInfo) {
        var actionPermissionsForRecord = cellInfo.data._actions;

        var permittedActions = _.pickBy(tableActions, function (actionItem, name) {
          return _.get(actionPermissionsForRecord, name, false);
        });

        var template = GridActionsTemplate(permittedActions, cellInfo);
        container.append(template);
      }
    }

    function handleActionInTable(schema) {
      return function (cellInfo) {
        var actionBtn = $(cellInfo.event.target).closest('[data-action]')[0];
        if (!actionBtn) {
          return;
        }

        var actionFnName = getActionCallbackName(cellInfo);
        var hasCustomAction = _.hasIn(appModelHelpers.CustomActions, actionFnName);
        if (hasCustomAction) {
          callCustomAction(cellInfo, schema);
          return;
        }

        if (_.hasIn(ActionsHandlers, actionFnName)) {
          callBuiltInAction(cellInfo, schema);
          return;
        }
      }
    }

    function callCustomAction(cellInfo, schema) {
      var actionFnArgs = AdpUnifiedArgs.getHelperParamsWithConfig({
        path: '',
        formData: cellInfo.data,
        action: getActionName(cellInfo),
        schema: schema,
      });

      var actionCallbackName = getActionCallbackName(cellInfo);
      var customActionFn = _.get(appModelHelpers, 'CustomActions.' + actionCallbackName);
      customActionFn.call(actionFnArgs, cellInfo.data);
    }

    function callBuiltInAction(cellInfo, schema) {
      var actionFnName = getActionCallbackName(cellInfo);

      ActionsHandlers[actionFnName](schema, cellInfo.data)
        .then(function () {
          GridOptionsHelpers.refreshGrid();
        });
    }

    function getActionCallbackName(cellInfo) {
      var actionElement = getActionElement(cellInfo);
      return actionElement.dataset.action;
    }

    function getActionName(cellInfo) {
      var actionElement = getActionElement(cellInfo);
      return actionElement.dataset.actionName;
    }

    function getActionElement(cellInfo) {
      var target = cellInfo.event.target;
      return $(target).closest('[data-action]')[0];
    }
  }
})();
