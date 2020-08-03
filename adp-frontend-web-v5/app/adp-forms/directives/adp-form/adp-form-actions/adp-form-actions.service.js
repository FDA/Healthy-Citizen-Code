;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpFormActionHandler', AdpFormActionHandler);

  /** @ngInject */
  function AdpFormActionHandler(
    ClientError,
    $injector,
    ACTIONS,
    $q
  ) {
    return function (action) {
      try {
        return findAction(action);
      } catch (e) {
        if (e instanceof ClientError) {
          console.error(e);
          return defaultAction(action.type);
        } else {
          throw e;
        }
      }
    }

    function findAction(action) {
      var type = _.get(action, 'action.type');

      if (!_.includes(['module', 'action'], type)) {
        throw new ClientError('Unknown action type in action\n' + logAction(action));
      }

      var actionHandler = {
        module: selectModuleHandler,
        action: selectHelpersAction,
      };

      return actionHandler[type](action);
    }

    function selectModuleHandler(action) {
      var moduleName = _.get(action, 'action.link', null);
      if (!$injector.has(moduleName)) {
        throw new ClientError('Module not found: ' + moduleName + '\n' + logAction(action));
      }

      var module = $injector.get(moduleName);
      var methodName = _.get(action, 'action.method', null);
      var method = module[methodName];
      if (methodName && _.isNil(method)) {
        throw new ClientError('Method not found in module: ' + moduleName + '\n' + logAction(action));
      }

      return method || module;
    }

    function selectHelpersAction(action) {
      var handler = _.get(window, 'appModelHelpers.CustomActions.' + action.action.link);
      if (_.isNil(handler)) {
        throw new ClientError('CustomActionHelper not found for action: \n' + logAction(action));
      }

      return handler;
    }

    function logAction(action) {
      return JSON.stringify(action, null, 2);
    }

    function defaultAction(type) {
      if (type === 'module') {
        return $q.resolve;
      } else if (type === 'action') {
        return _.noop;
      }
    }
  }
})();
