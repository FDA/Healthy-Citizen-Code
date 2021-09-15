;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('TreeViewDataMapper', TreeViewDataMapper);

  /** @ngInject */
  function TreeViewDataMapper() {
    return function (data) {
      var mapped = mapDataToTreeView(data);
      return mapped.items;
    }

    function mapDataToTreeView(data, name) {
      if (_.isArray(data)) {
        return {
          text: nameTpl(name),
          items: mapToArray(data),
        };
      } else if (_.isObject(data)) {
        return {
          text: nameTpl(name),
          items: mapToObject(data),
        };
      } else {
        return { text: nameTpl(name) + data };
      }

      function mapToArray(array) {
        return _.chain(array)
          .compact()
          .map(mapDataToTreeView)
          .value();
      }

      function mapToObject(object) {
        return _.chain(object)
          .map(mapDataToTreeView)
          .compact()
          .value();
      }
    }

    function nameTpl(name) {
      return '<b>' + name + '</b>: ';
    }
  }
})();
