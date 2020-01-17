;(function () {
  'use strict';

  angular.module('app.adpTables', [])
  .config(onConfig)
  .config(registerDateFormats);

  function onConfig(AdpTablesExtendProvider) {
    AdpTablesExtendProvider.extend();
  }

  function registerDateFormats(TIME_FORMAT, DATE_FORMAT, DATE_TIME_FORMAT) {
    // keys as Type:Subtype
    var dateTypes = {
      'Date': DATE_FORMAT,
      'Date:Time': TIME_FORMAT,
      'Date:DateTime': DATE_TIME_FORMAT
    };

    _.each(dateTypes, function (format, type) {
      $.fn.dataTable.moment(format, type);
    });
  }
})();
