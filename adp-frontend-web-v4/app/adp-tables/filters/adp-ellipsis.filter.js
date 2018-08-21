;(function () {
  'use strict';
  
  angular
    .module('app.adpTables')
    .filter('adpEllipsis', adpEllipsis);
  
  function adpEllipsis () {
    return function (value, type) {
      var strLimit = 40;
      
      if (!value) return '-';
      
      return type === 'display' && value.length > strLimit ?
        value.substr( 0, strLimit ) + '…' :
        value;
    };
  }
})();
