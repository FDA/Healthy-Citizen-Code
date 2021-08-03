(function () {
  'use strict';

  angular.module('app.adpOtpConfigControl')
    .component('adpOtpConfigControlDialogComponent', {
      template: '<div class="smart-form client-form otp-setup-dialog">' +
        '  <header class="smart-form-header">' +
        '    <h2 class="semi-bold">Two-Factor Auth Setup</h2>' +
        '  </header>' +
        '  ' +
        '  <adp-page-loader loading="vm.loading"></adp-page-loader>' +
        '  ' +
        '      <form name="form" novalidate ng-submit="vm.formSubmit(form)">' +
        '  <div class="row">' +
        '    <div class="col col-4 adp-otp-section">' +
        '      <div class="adp-otp-section-header">' +
        '        <span class="adp-big-number">1</span> Install' +
        '      </div>' +
        '      <p>Install two-factor authentication application on your mobile device.</p>' +
        '      <p>We recommend <b>Twilio Authy</b>' +
        '      (<a href="https://play.google.com/store/apps/details?id=com.authy.authy" target="_blank">Google Play</a>, ' +
        '      <a href="https://apps.apple.com/ru/app/twilio-authy/id494168017" target="_blank">Apple App Store</a>) ' +
        '      but you can use any analog as Google Authenticator, etc.</p>' +
        '    </div> ' +
        '    <div class="col col-4 adp-otp-section">' +
        '      <div class="adp-otp-section-header">' +
        '        <span class="adp-big-number">2</span> Add counter' +
        '      </div>' +
        '      <p>Scan following code with your auth application</p>' +
        '      <div class="text-center">' +
        '        <img src="{{vm.qrCodeDataUrl}}" id="adp-otp-qr-code" /><br />' +
        '        <p>No QR scanner available?</p>' +
        '        <p>Use this key for manual enter:</p>' +
        '        <div class="adp-otp-secret">' +
        '          <div ng-repeat="code in vm.secretDisplay track by $index">{{code}}</div>' +
        '        </div>' +
        '      </div>' +
        '    </div>' +
        '    <div class="col col-4 adp-otp-section">' +
        '      <div class="adp-otp-section-header">' +
        '        <span class="adp-big-number">3</span> Verify' +
        '      </div>' +
        '      <p>Please verify added counter by entering generated 6-digits code:</p>' +
        '      <br/>' +
        '      <adp-form-field-default' +
        '          args="vm.formArgs"' +
        '          form-context="vm.formContext"' +
        '          ng-attr-adp-qaid-field="twoFactorToken"' +
        '        ></adp-form-field-default>' +
        '      <div class="note-error col col-12 text-right" ng-if="vm.error">' +
        '        {{vm.error}}' +
        '      </div>' +
        '    </div>' +
        '  </div>' +
        '    <footer class="adp-action-b-container">' +
        '      <button' +
        '          class="adp-action-b-secondary"' +
        '          type="button"' +
        '          ng-click="vm.close()">' +
        '          Cancel setup' +
        '      </button>' +
        '      <button' +
        '          class="btn btn-primary"' +
        '          type="submit">' +
        '          Set two-factor' +
        '      </button>' +
        '    </footer>' +
        '  </form>' +
        '</div>',
      bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
      },
      controller: 'AdpOtpConfigControlController',
      controllerAs: 'vm'
    });
})();
