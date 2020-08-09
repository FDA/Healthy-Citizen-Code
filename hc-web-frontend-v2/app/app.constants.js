;(function () {
  'use strict';

  angular
    .module('app')
    // FIXME: BS_DATE_FORMAT is temp format, remove after full transition to moment
    .constant('BS_DATE_FORMAT', 'mm/dd/yy')
    .constant('DATE_FORMAT', 'M/D/YYYY')
    .constant('APP_CONFIG', window.appConfig);
})();