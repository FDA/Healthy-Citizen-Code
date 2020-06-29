;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlTreeSelectorField', GraphqlTreeSelectorField);

  /** @ngInject */
  function GraphqlTreeSelectorField(
    GraphqlHelper
  ) {
    return {
      get: get
    };

    function get(field, name) {
      var fieldsString = treeSelectorItems();
      return GraphqlHelper.wrapFieldString(fieldsString, name);
    }

    function treeSelectorItems() {
      var fields = [
        '_id',
        'label',
        'table',
      ];

      return fields.join('\n');
    }
  }
})();
