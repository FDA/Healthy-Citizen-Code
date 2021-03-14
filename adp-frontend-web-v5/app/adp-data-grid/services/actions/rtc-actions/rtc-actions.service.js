;(function () {
    'use strict';
    var ACTIONS_POSITION_SIGNATURE = 'rtc';

    angular
      .module('app.adpDataGrid')
      .factory('GridRtcActions', GridRtcActions);

    /** @ngInject */
    function GridRtcActions(
      ActionsHelpers,
      AdpUnifiedArgs,
      AdpSocketIoService
    ) {
      var actionFactoriesByType = {
        'action': ActionsHelpers.getForHelperType,
        'link': getForLinkType,
        'module': ActionsHelpers.getForModuleType,
      };

      return function (gridOptions, schema, customGridOptions) {
        var actions = ActionsHelpers.getActionsByPosition(
          schema,
          function (action) {
            return _.get(action, 'position', '') === ACTIONS_POSITION_SIGNATURE;
          });
        var methodsCache = [];

        _.each(actions, function (action) {
          var actionType = _.get(action, 'action.type', '')
          var actionLink = _.get(action, 'action.link', '')
          var actionFactory = actionFactoriesByType[actionType];
          var actionMethod = actionFactory && actionFactory(actionLink, action);

          if (_.isFunction(actionMethod)) {
            var context = AdpUnifiedArgs.getHelperParamsWithConfig({
              path: '',
              formData: null,
              action: 'rtcAction',
              schema: schema,
            });

            context.fieldSchema = action;
            context.customGridOptions = customGridOptions;
            context.gridOptions = gridOptions;

            var item = {
              processor: actionMethod.call(context)
            }

            if (_.isFunction(actionMethod.onUnsubscribe)) {
              item.destructor = actionMethod.onUnsubscribe;
              item.context = context;
            }

            methodsCache.push(item);
          }
        })

        if (actions.length) {
          var stages = {
            onInitialized: function () {
              _.each(methodsCache, function (item) {
                AdpSocketIoService.registerMessageProcessor(item.processor);
              })
            },
            onDisposing: function () {
              _.each(methodsCache, function (item) {
                AdpSocketIoService.unRegisterMessageProcessor(item.processor);
                if (_.isFunction(item.destructor)) {
                  item.destructor.call(item.context);
                }
              })
            },
          };

          _.each(stages, function (eventAction, eventName) {
            var prevHandler = gridOptions[eventName];

            gridOptions[eventName] = function (event) {
              if (prevHandler) {
                prevHandler(event);
              }
              eventAction();
            }
          });
        }
      }

      function getForLinkType(linkUrl) {
        return null; // link action is not applicable for Rtc actions
      }
    }
  }
)();
