;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .factory('LookupBtns', LookupBtns);

  /** @ngInject */
  function LookupBtns(AdpSchemaService, ActionsHandlers) {
    return function (selectedTableName) {
      return [{
        name: 'Create record',
        options: {
          icon: 'plus',
          elementAttr: {
            class: 'adp-lookup-create-button',
            'lookup-action': 'create',
          },
          onClick: getCreateAction(selectedTableName),
        }
      }, 'clear', 'dropDown']
    };

    function getCreateAction(selectedTableName) {
      return function () {
        var schema = AdpSchemaService.getSchemaByName(selectedTableName);
        ActionsHandlers.create(schema);
      }
    }
  }
})();
