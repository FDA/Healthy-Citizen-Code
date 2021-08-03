(function () {
  'use strict';

  angular.module('app.adpOtpConfigControl')
    .factory('AdpOtpHelper', AdpOtpHelper);

  function AdpOtpHelper(
    $http,
    APP_CONFIG,
    AdpNotificationService
  ) {

    return {
      const: constants(),
      url: urls(),
      request: request
    }

    function constants() {
      return {
        SECRET_FIELD_NAME: 'twoFactorSecret',
        BACKUP_COUNTER_FIELD_NAME: 'twoFactorBackupCounter',
        BACKUP_USED_FIELD_NAME: 'twoFactorUsedCounters',
        IS_ENABLED: 'is enabled',
        IS_DISABLED: 'is disabled',
        CONFIRM_DISABLE_MSG: 'Are you sure to disable %label% for this user?',
        CONFIRM_BACKUP_CLEAR_MSG: 'Are you sure you want to delete the backup codes?',
        CONFIRM_REPLACE_MSG: 'WARNING: generating new codes will make all previously generated codes invalid',
        CONFIRM_REPLACE_BUTTON_LABEL: 'Generate new codes',
        BACKUP_CODES_IMPORTANCE_MSG: 'Backup codes are very important to secure your account and available on user profile page after registration. It\'s highly recommended to go to Menu --> Profile, generate and save backup codes in safe place',
      }
    }

    function urls() {
      return {
        getBackupCodes: APP_CONFIG.apiUrl + '/backupCodes',
        getNewBackupCodes: APP_CONFIG.apiUrl + '/newBackupCodes',
        clearBackupCodes: APP_CONFIG.apiUrl + '/clearBackupCodes',
        getOtpSecret: APP_CONFIG.apiUrl + '/otpSecret',
        enableTwoFactor: APP_CONFIG.apiUrl + '/enableTwoFactor',
        verifyOtpCode: APP_CONFIG.apiUrl + '/verifyOtpCode',
        disableOtp: APP_CONFIG.apiUrl + '/disableOtp'
      }
    }

    function request(vm, url, _params) {
      var params = _params || {};
      var method = params.method || 'get';
      var httpParams = [url];

      if (params.body) {
        httpParams.push(JSON.stringify(params.body));
      }

      return $http[method].apply(this, httpParams)
        .then(function (res) {
          if (!res.data.success) {
            throw new Error(res.data.message);
          } else {
            return res.data;
          }
        })
        .catch(function (err) {
          AdpNotificationService.notifyError((err.data && err.data.message) || err.message || err);
          throw new Error(err);
        })
        .finally(function () {
          if (vm) {
            vm.loading = false;
          }
        })
    }
  }
})();
