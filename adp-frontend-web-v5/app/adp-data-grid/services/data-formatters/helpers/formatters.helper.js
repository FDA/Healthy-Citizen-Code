;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('FormattersHelper', FormattersHelper);

  /** @ngInject */
  function FormattersHelper() {

    function asText(args) {
      return _.get(args, "params.asText", false);
    }

    return {
      asText: asText
    }
  }
})();
