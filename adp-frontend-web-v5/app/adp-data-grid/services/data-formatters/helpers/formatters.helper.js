;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('FormattersHelper', FormattersHelper);

  /** @ngInject */
  function FormattersHelper() {
    return {
      asText: function(args) {return _.get(args, "params.asText", false);},
      commaDotSeparator: function(args) {return _.get(args, "params.commaDotSeparator");},
    }
  }
})();
