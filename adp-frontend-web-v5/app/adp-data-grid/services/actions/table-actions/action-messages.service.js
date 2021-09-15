;(function () {
  'use strict';

  angular
    .module("app.adpDataGrid")
    .factory("ActionMessages", ActionMessages);

  /** @ngInject **/
  function ActionMessages(ACTIONS) {
    var MESSAGES = {};

    MESSAGES[ACTIONS.CREATE] = function (schema) {
      return getSingleRecordTitle(schema) + " has been added.";
    };

    MESSAGES[ACTIONS.CLONE] = MESSAGES[ACTIONS.CREATE];
    MESSAGES[ACTIONS.CLONE_DATASET] = MESSAGES[ACTIONS.CREATE];

    MESSAGES[ACTIONS.UPDATE] = function (schema) {
      return getSingleRecordTitle(schema) + " has been updated.";
    };

    MESSAGES[ACTIONS.DELETE] = function (schema) {
      return getSingleRecordTitle(schema) + " has been deleted.";
    };

    return MESSAGES;

    function getSingleRecordTitle(schema) {
      if (schema.singleRecordName) {
        return schema.singleRecordName;
      } else {
        var name = schema.fullName || schema.schemaName;
        return pluralize.singular(name) || (name + " record");
      }
    }
  }
})();
