;(function() {

  angular
    .module('app.adpCommon')
    .factory('AdpNotificationService', AdpAdpNotificationService);

  /** @ngInject */
  function AdpAdpNotificationService() {
    var service = {
      notifyError: notifyError,
      notifySuccess: notifySuccess,
      errorCounter: 0
    };

    return service;

    function notifyError(message) {
      $.bigBox({
        title: message,
        color: "#C46A69",
        icon: "fa fa-warning shake animated",
        number: ++service.errorCounter,
        timeout: 6000
      });
    }

    function notifySuccess(message) {
      $.smallBox({
        title: message,
        color: "#5F895F",
        iconSmall: "fa fa-check bounce animated",
        timeout: 4000
      });
    }
  }
})();