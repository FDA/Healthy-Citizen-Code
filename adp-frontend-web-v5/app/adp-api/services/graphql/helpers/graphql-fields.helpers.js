;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlHelper', GraphqlHelper);

  /** @ngInject */
  function GraphqlHelper() {
    return {
      wrapFieldString: wrapFieldString,
      collectionQueryName: collectionQueryName,
    };

    function wrapFieldString(fieldsString, name) {
      return [
        name,
        '{',
        fieldsString,
        '}',
      ].join('\n');
    }

    function collectionQueryName(schema, params) {
      return schema.schemaName + 'Dx' + (params.group ? 'Group' : '');
    }
  }
})();
