;(function () {
  'use strict';
  
  angular
    .module('app.hcTables')
    .filter('hcEllipsis', hcEllipsis);
  
  function hcEllipsis () {
    return function (value, type) {
      var strLimit = 40;
      
      if (!value) return '-';
      
      return type === 'display' && value.length > strLimit ?
        value.substr( 0, strLimit ) + '…' :
        value;
    };
  }
})();
