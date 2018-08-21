;(function () {
  'use strict';

  angular
    .module('app.adpGenerator')
    .provider('AdpTablesExtend', AdpTablesExtend);

  /** @ngInject */
  function AdpTablesExtend() {
    var service = {
      extend: function () {
        addExtensions();
        addTypes();
      },
      $get: function () {
        return service;
      }
    };

    var extensions = {
      'html': function customHtmlExt(data) {
        var tempDiv = $('<div>'),
          stripedText;

        tempDiv.html(data.replace(/<br>/g, ' '));
        stripedText = tempDiv.text();

        tempDiv = null;

        return stripedText;
      }
    };

    function addExtensions() {
      _.each(extensions, function (cb, name) {
        var dtExtensionsRef = jQuery.fn.dataTable.ext.type.search;
        dtExtensionsRef[name] = cb;
      });
    }

    function addTypes() {
      $.fn.dataTable.moment = function (format, type, locale) {
        var types = $.fn.dataTable.ext.type;

        // Add type detection
        types.detect.unshift(function ( d ) {
          return moment(d, format, locale, true).isValid() ? type : null;
        });

        // Add sorting method - use an integer for the sorting
        // -pre preformatting
        types.order[type + '-pre'] = function (d) {
          var momentDate = moment(d, format, locale, true);
          var date = momentDate.isValid() ? momentDate : moment(0);

          return date.unix();
        };
      };
    }

    return service;
  }
})();