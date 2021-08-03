(function () {
  'use strict';

  angular.module('app.adpOtpConfigControl')
    .component('adpOtpBackupCodesDialogComponent', {
      template:
        '<div class="modal-header">' +
        '  <h3 class="modal-title">Two-Factor Auth Backup Options</h3>' +
        '</div>' +
        '<div class="modal-body">' +
        '  <adp-page-loader loading="vm.loading"></adp-page-loader>' +
        '  <div ng-if="!vm.loading">' +
        '    <p ng-if="vm.codes.length">Please keep this codes in safe place and use them if you two-factor authentification device is not available.<br/>Each backup code can be used only once.</p>' +
        '    <div ng-if="vm.codes.length"' +
        '         class="adp-otp-backup-codes">' +
        '      <div ng-repeat="code in vm.codes track by $index"' +
        '           class="adp-otp-backup-codes-item" ' +
        '           ng-class="{used: code.used}">{{code.value}}</div>'+
        '    </div>' +
        '    <h3 ng-if="!vm.codes.length">No backup codes available</h3>' +
        '  </div>' +
        '</div>' +
        '<div class="modal-footer">' +
        '  <button class="adp-action-b-secondary"' +
        '          ng-if="vm.codes && vm.codes.length"' +
        '          type="button"' +
        '          ng-click="vm.doDelete()">Delete backup codes</button>' +
        '  <button class="adp-action-b-tertiary"' +
        '          type="button"' +
        '          ng-click="vm.doGenerate()">Generate backup codes</button>' +
        '  <button class="adp-action-b-primary"' +
        '          type="button"' +
        '          ng-click="vm.doClose()">Close</button>' +
        '</div>',
      bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
      },
      controller: 'AdpOtpBackupCodesController',
      controllerAs: 'vm'
    });
})();
