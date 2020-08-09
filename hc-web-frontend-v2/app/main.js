;(function () {
  'use strict';
  
  $.sound_path = appConfig.sound_path;
  $.sound_on = appConfig.sound_on;
  // moment.js default language
  moment.locale('en');

  angular
    .module('APP_MODEL_CONFIG')
    .constant('LISTS', appModelHelpers['Lists'])
})();
