;(function () {
  'use strict';
  var ACTIONS_POSITION_SIGNATURE = 'grid.lifecycle';

  angular
    .module('app.adpDataGrid')
    .factory('GridLifecycleActions', GridLifecycleActions);

  /** @ngInject */
  function GridLifecycleActions(
    ActionsHelpers
  ) {
    var actionFactoriesByType = {
      'action': ActionsHelpers.getForHelperType,
      'link': getForLinkType,
      'module': ActionsHelpers.getForModuleType,
    };

    var lifecycleStages = {
      init: {
        eventName: 'onInitialized',
        defaultAction: function (event, gridOptions, schema, customGridOptions) {
          customGridOptions.setGridComponent(event.component);
        }
      },
      dispose: {
        eventName: 'onDisposing',
      },
    };

    return function (gridOptions, schema, customGridOptions) {
      var actions = ActionsHelpers.getActionsByPosition(
        schema,
        function (action) {
          return _.get(action, 'position', '') === ACTIONS_POSITION_SIGNATURE;
        });

      _.each(lifecycleStages, function (stage, stageName) {
        var eventName = stage.eventName;
        var defaultAction = stage.defaultAction || _.noop;
        var prevHandler = gridOptions[eventName];

        gridOptions[eventName] = function (event) {
          if (prevHandler) {
            prevHandler(event);
          }

          defaultAction(event, gridOptions, schema, customGridOptions);

          _.each(actions, function (action) {
            var actionType = _.get(action, 'action.type', '')
            var actionLink = _.get(action, 'action.link', '')
            var actionFactory = actionFactoriesByType[actionType];
            var actionMethod = actionFactory(actionLink, action);

            if (_.isFunction(actionMethod)) {
              var context = {
                schema: schema,
                customGridOptions: customGridOptions,
                gridOptions: gridOptions,
              };

              actionMethod.call(context, stageName, event);
            }
          })
        }
      });
    }

    function getForLinkType(linkUrl) {
      return null; // link action is not applicable for lifecycle actions
    }
  }
})();
