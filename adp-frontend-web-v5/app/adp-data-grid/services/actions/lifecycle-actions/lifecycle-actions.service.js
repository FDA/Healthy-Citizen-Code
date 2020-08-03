;(function () {
  "use strict";
  var ACTIONS_POSITION_SIGNATURE = "grid.lifecycle";

  angular
    .module("app.adpDataGrid")
    .factory("GridLifecycleActions", GridLifecycleActions);

  /** @ngInject */
  function GridLifecycleActions(
    AdpSchemaService
  ) {
    var actionFactoriesByType = {
      "action": getForHelperType,
      "link": getForLinkType,
      "module": getForModuleType,
    };

    var lifecycleStages = {
      init: {
        eventName: "onInitialized",
        defaultAction: function (event, gridOptions, schema, customGridOptions) {
          customGridOptions.setGridComponent(event.component);
        }
      },
      dispose: {
        eventName: "onDisposing",
      },
    };

    return function (gridOptions, schema, customGridOptions) {
      var actions = getLifecycleActions(schema);

      _.each(lifecycleStages, function (stage, stageName) {
         var eventName = stage.eventName;
         var defaultAction = stage.defaultAction || _.noop;

        gridOptions[eventName] = function(event) {
            defaultAction(event, gridOptions, schema, customGridOptions);

          _.each(actions, function (action) {
            var actionType = _.get(action, "action.type", "")
            var actionLink = _.get(action, "action.link", "")
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

    function getForHelperType(actionName) {
      var helperAction = _.get(appModelHelpers, "CustomActions." + actionName);

      if (helperAction) {
        return helperAction;
      }
    }

    function getForLinkType(linkUrl) {
      return null; // link action is not applicable for lifecycle actions
    }

    function getForModuleType(moduleName, action) {
      return null;  // ToDo: yet to be implemented
    }

    function getLifecycleActions(schema) {
      var actions = _.chain(schema)
        .get('actions.fields', {})
        .pickBy(function (action) {
          return _.get(action, 'position', '') === ACTIONS_POSITION_SIGNATURE;
        })
        .map(function (action, name) {
          action.__name = name;
          return action;
        })
        .value();

      return actions.sort(AdpSchemaService.getSorter('actionOrder'));
    }
  }
})();
