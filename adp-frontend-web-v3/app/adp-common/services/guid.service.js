;(function() {
  'use strict';

  angular
    .module('app.adpCommon')
    .service('Guid', Guid);

  /** @ngInject */
  function Guid () {
    // not a real guid
    function create() {
      function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
          .toString(16)
          .substring(1);
      }

      return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
    }

    function isGuid(string) {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(string);
    }

    return {
      create: create,
      isGuid: isGuid
    }
  }
})();
