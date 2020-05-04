;(function () {
  'use strict';
  var ROW_POSITION_SIGNATURE = "grid.row";

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
        cellTemplate: actionsTemplate(tableActions),
        allowExporting: false,
        hidingPriority: schema.actions.responsivePriority,
        visible: true,
        showInColumnChooser: true,
      });

      options.onCellClick = handleActionInTable(schema, customGridOptions);
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

    function handleActionInTable(schema, customGridOptions) {
      return function (cellInfo) {
        var actionBtn = $(cellInfo.event.target).closest('[data-action]')[0];
        if (!actionBtn) {
          return;
        }

        var actionType = getActionType(cellInfo);

        if (actionType==='module') {
            callModuleAction(cellInfo, schema, customGridOptions.gridComponent);
        } else {
          var actionFnName = getActionCallbackName(cellInfo);
          var hasCustomAction = _.hasIn(appModelHelpers.CustomActions, actionFnName);
          if (hasCustomAction) {
            callCustomAction(cellInfo, schema);
            return;
          }

          if (_.hasIn(ActionsHandlers, actionFnName)) {
            callBuiltInAction(cellInfo, schema, customGridOptions.gridComponent);
            return;
          }
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

    function callBuiltInAction(cellInfo, schema, gridInstance) {
      var actionFnName = getActionCallbackName(cellInfo);

      ActionsHandlers[actionFnName](schema, cellInfo.data)
        .then(function () {
          GridOptionsHelpers.refreshGrid(gridInstance);
        });
    }

    function callModuleAction(cellInfo, schema, gridInstance) {
      var injector = angular.element(document).injector();
      var actionFnArgs = AdpUnifiedArgs.getHelperParamsWithConfig({
        path: "",
        formData: cellInfo.data,
        action: getActionName(cellInfo),
        schema: schema,
      });
      var actionCallback = getActionCallbackName(cellInfo).split('.');
      var actionModule = actionCallback[0];
      var actionMethod = actionCallback[1];

      if (injector.has(actionModule)) {
        var customActionFn = injector.get(actionModule);

        if (actionMethod) {
          customActionFn = customActionFn[actionMethod];
        }

        if (_.isFunction(customActionFn)) {
          customActionFn.apply(actionFnArgs, [cellInfo.data, gridInstance]);
        }
      }
    }

    function getActionCallbackName(cellInfo) {
      var actionElement = getActionElement(cellInfo);
      return actionElement.dataset.action;
    }

    function getActionName(cellInfo) {
      var actionElement = getActionElement(cellInfo);
      return actionElement.dataset.actionName;
    }

    function getActionType(cellInfo) {
      var actionElement = getActionElement(cellInfo);
      return actionElement.dataset.type;
    }

    function getActionElement(cellInfo) {
      var target = cellInfo.event.target;
      return $(target).closest('[data-action]')[0];
    }

    function actionsIsEmpty(actions) {
      var actionNames = _.keys(actions);
      var hasOnlyViewsKey = actionNames.length === 0 && actionNames[0] === 'view';
      return _.isEmpty(actions) || hasOnlyViewsKey;
    }
  }
})();
