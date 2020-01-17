;(function () {
  'use strict';

  angular
    .module('app.adpApi')
    .factory('GraphqlLocationField', GraphqlLocationField);

  /** @ngInject */
  function GraphqlLocationField(GraphqlHelper) {
    return {
      get: get
    };

    function get(field, name) {
      var fieldsString = locationItems();
      return GraphqlHelper.wrapFieldString(fieldsString, name);
    }

    function locationItems() {
      var fields = [
        'coordinates',
        'label',
      ];

      return fields.join('\n');
    }
  }
})();
