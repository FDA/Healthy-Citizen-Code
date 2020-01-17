;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('ActionMessages', ActionMessages);

  /** @ngInject */
  function ActionMessages(ACTIONS) {
    var MESSAGES = {};
    MESSAGES[ACTIONS.CREATE] = function (schema) {
      return schema.fullName + ' successfully added.';
    };
    MESSAGES[ACTIONS.CLONE] = MESSAGES[ACTIONS.CREATE];

    MESSAGES[ACTIONS.UPDATE] = function (schema) {
      return schema.fullName + ' successfully updated.';
    };

    MESSAGES[ACTIONS.DELETE] = function (schema) {
      return schema.fullName + ' successfully deleted.';
    };

    return MESSAGES;
  }
})();
