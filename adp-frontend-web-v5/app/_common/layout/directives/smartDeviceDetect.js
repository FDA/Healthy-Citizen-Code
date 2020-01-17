;(function() {
  'use strict';

  /**
   * DETECT MOBILE DEVICES
   * Description: Detects mobile device - if any of the listed device is
   *
   * detected class is inserted to <tElement>.
   *
   *  (so far this is covering most hand held devices)
   */
  angular
    .module('SmartAdmin.Layout')
    .directive('smartDeviceDetect', function (AdpBrowserService) {
      return {
        restrict: 'A',
        compile: function (tElement) {
          tElement.removeAttr('smart-device-detect data-smart-device-detect');

          var isMobile = AdpBrowserService.isMobile();

          tElement.toggleClass('desktop-detected', !isMobile);
          tElement.toggleClass('mobile-detected', isMobile);
        }
      }
    });
})();