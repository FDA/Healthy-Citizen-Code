(function () {
  'use strict';

  angular.module('app.adpOtpConfigControl')
    .controller('AdpOtpConfigControlController', AdpOtpConfigControlController);

  /** @ngInject */
  function AdpOtpConfigControlController(
    $scope,
    AdpAuthSchemas,
    AdpUnifiedArgs,
    AdpOtpHelper
  ) {
    var vm = this;
    var isRegisterForm;

    vm.otpArgs = AdpAuthSchemas.loginOtpArgs();
    vm.formOptions = {
      disableFullscreen: true,
      localActionsStrategy: {
        submit: function (args) {
          return doSetOtp(args.row);
        }
      }
    };
    vm.formContext = {
      visibilityMap: {},
      requiredMap: {}
    };
    vm.formArgs = AdpUnifiedArgs.getHelperParams({
      path: 'twoFactorToken',
      schema: vm.otpArgs.modelSchema,
      action: vm.otpArgs.action,
      formData: vm.otpArgs.row || {}
    })

    vm.$onInit = doInit;
    vm.save = doSetOtp;
    vm.loading = true;
    vm.scp = $scope;
    vm.formSubmit = doSetOtp;

    function doInit() {
      var login = vm.resolve.options.login;
      isRegisterForm = vm.resolve.options.isRegisterForm;

      AdpOtpHelper.request(vm, AdpOtpHelper.url.getOtpSecret, {method:'post', body: {login: login}})
        .then(function(data){
          vm.secretDisplay = data.data.base32.replace(/(.{4}(?=.))/g, '$1 ').split(" ");
          vm.qrCodeDataUrl = data.data.qrCodeDataUrl;
        })
    }

    function doSetOtp(form) {
      var otpCode = form.twoFactorToken.$viewValue;

      vm.error = '';

      if (!otpCode) {
        vm.error = 'Verification token is required';
        return;
      }

      if (!otpCode || form.$invalid) {
        vm.error = 'Verification token has invalid format';
        return;
      }

      vm.loading = true;

      var data = { otpCode: otpCode };
      var url = isRegisterForm ? AdpOtpHelper.url.verifyOtpCode : AdpOtpHelper.url.enableTwoFactor;

      AdpOtpHelper.request(vm, url, { method: 'post', body: data})
        .then(function(){
          vm.close({$value: {status: true}});
        })
        .catch(function(){
        })
    }
  }
})();
