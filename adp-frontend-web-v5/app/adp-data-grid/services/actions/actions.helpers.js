;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('ActionsHelpers', ActionsHelpers);

  /** @ngInject */
  function ActionsHelpers(
    AdpSchemaService,
    AdpUnifiedArgs
  ) {
    function getActionsByPosition(schema, pickFunction) {
      var actions = _.chain(schema)
                     .get('actions.fields', {})
                     .pickBy(pickFunction || _.noop)
                     .map(function (action, name) {
                       action.__name = name;
                       return action;
                     })
                     .value();

      return actions.sort(AdpSchemaService.getSorter('actionOrder'));
    }

    function getForHelperType(actionName) {
      var helperAction = _.get(appModelHelpers, 'CustomActions.' + actionName);

      if (helperAction) {
        return helperAction;
      }
    }

    function getForModuleType(moduleName, action) {
      var injector = angular.element(document).injector();

      if (injector.has(moduleName)) {
        var methodName = _.get(action, 'action.method');
        var moduleReturn = injector.get(moduleName);

        if (methodName) {
          return moduleReturn[methodName];
        } else {
          return moduleReturn;
        }
      } else {
        console.error('No module found for action:', moduleName);
      }
    }

    function evalDisabledAttr(actionItem, recordData, schema) {
      if (_.isNil(actionItem.enabled)) {
        return false;
      }

      if (_.isString(actionItem.enabled)) {
        var args = AdpUnifiedArgs.getHelperParamsWithConfig({
          path: '',
          action: actionItem.__name,
          formData: recordData || {},
          schema: schema,
        });

        try {
          var fn = new Function('return ' + actionItem.enabled);
          return !fn.call(args);
        } catch (e) {
          console.error('Error while trying to eval "enabled" attribute for: ', args);
        }
      }

      return !actionItem.enabled;
    }


    return {
      getActionsByPosition: getActionsByPosition,
      getForHelperType: getForHelperType,
      getForModuleType: getForModuleType,
      evalDisabledAttr: evalDisabledAttr,
    };
  }
})()
