;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .component('adpInactivityLogoutDialogModal', {
      template: [
        '<div class="modal-header">',
        '  <h3 class="modal-title">You have been inactive for a while</h3>',
        '</div>',
        '<div class="modal-body">',
        '<p>For your security, we will automatically sign you out <strong>{{vm.timeTicker}}</strong></p>',
        '<p>Please click "Sign out" to sign out immediately or "Stay signed in" to continue your session.</p>',
        '</div>',
        '<div class="modal-footer">',
        '  <button',
        '          class="adp-action-b-secondary"',
        '          type="button"',
        '          ng-click="vm.prolong()">Stay signed in',
        '  </button>',
        '  <button',
        '    class="adp-action-b-primary"',
        '    type="button"',
        '    ng-click="vm.logout()">Sign out',
        '  </button>',
        '</div>'].join(''),
      bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
      },
      controller: AdpInactivityLogoutDialogModalController,
      controllerAs: 'vm'
    });

  /** @ngInject */
  function AdpInactivityLogoutDialogModalController(
    $timeout
  ) {
    var vm = this;
    var timeoutAt;
    var timer

    vm.$onInit = function () {
      timeoutAt = (new Date).getTime() + vm.resolve.options.timeout;
      updateTimer();
    };

    vm.$onDestroy = clearTimeout;

    vm.prolong = function () {
      vm.close({$value: { prolong: true }});
    };

    vm.logout = function () {
      vm.close({$value: { logout: true }});
    };

    function updateTimer() {
      var leftSeconds = (timeoutAt - (new Date).getTime()) / 1000;

      if (leftSeconds > 1) {
        var mins = format(leftSeconds / 60);
        var secs = format(leftSeconds % 60);

        vm.timeTicker = 'in ' + mins + ':' + secs;

        setTimeout();
      } else {
        vm.timeTicker = 'right now';
      }
    }

    function setTimeout() {
      timer = $timeout(function () {
        updateTimer();
      }, 1000);
    }

    function clearTimeout() {
      $timeout.cancel(timer);
    }

    function format(timeFraction) {
      return ('00' + Math.floor(timeFraction)).substr(-2);
    }
  }
})();
