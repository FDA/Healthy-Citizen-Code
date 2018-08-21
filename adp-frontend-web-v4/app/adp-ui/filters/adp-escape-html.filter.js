;(function () {
  'use strict';

  angular
    .module('app.adpTables')
    .filter('adpEscapeHtml', adpEscapeHtml);

  var entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

  function escapeHtml (string) {
    return String(string).replace(/[&<>"'`=\/]/g, function (s) {
      return entityMap[s];
    });
  }

  function adpEscapeHtml () {
    return escapeHtml
  }
})();
