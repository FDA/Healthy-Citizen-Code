(function () {
  'use strict';

  angular.module('app.adpOtpConfigControl', [])
    .factory('AdpOtpConfigControl', AdpOtpConfigControl);

  /** @ngInject */
  function AdpOtpConfigControl(
    AdpNotificationService,
    AdpOtpHelper,
    AdpModalService
  ) {
    return function () {
      var context = this;
      var isOtpActive = this.data;
      var $container = $('<div>');
      var fieldName = _.get(context, 'fieldSchema.fieldName');
      var isRegisterForm = _.get(context, 'fieldSchema.formRenderer.renderMode') === 'register';
      var featureName = _.get(context, 'fieldSchema.fullName') || fieldName;
      var currentUser = lsService.getUser();
      var isEnableAllowed = isRegisterForm || (currentUser.login === this.row.login);

      generateControl(isOtpActive);

      return $container;

      function generateControl(isOtpActive) {
        var appInterface = window.adpAppStore.appInterface()
        var mfaRequired =  _.get(appInterface, "app.auth.requireMfa");
        var $primaryButton = $('<div>').addClass('btn');
        var $statusText;
        var $backupButton;

        if (!isRegisterForm) {
          $statusText = $('<div>').text(featureName + ' ' + getEnableDisableLabel(isOtpActive));
          $primaryButton = $('<div>').addClass('adp-action-b-primary');
        }

        if (isOtpActive) {
          $backupButton = $('<div>')
            .addClass('btn adp-action-b-secondary')
            .text(featureName + ' backup codes');

          if (isRegisterForm || mfaRequired) {
            if (isEnableAllowed) {
              $primaryButton.text('Re-initialize ' + featureName).click(enableOtp);
            } else {
              $primaryButton = null;
            }
          } else {
            $primaryButton.text('Disable ' + featureName).click(disableOtp);
          }

          if (isRegisterForm) {
            $backupButton.click(showAboutBackupImportance);
          } else {
            $backupButton.addClass('adp-action-b-secondary').click(showBackupCodes);
          }
        } else {
          if (isEnableAllowed) {
            $primaryButton.text('Enable ' + featureName).click(enableOtp);
          } else {
            $primaryButton = null;
          }
        }

        _.reduce([$statusText, ' ', $primaryButton, ' ', $backupButton],
          function ($container, $elem) {
            $elem && $container.append($elem)

            return $container;
          }, $container.empty());
      }

      function setOtpFieldsData(isOtpActive) {
        var notification = featureName + ' ' + getEnableDisableLabel(isOtpActive);

        AdpNotificationService.notifySuccess(notification);

        generateControl(isOtpActive);
        setOtpBackupFieldsData(null, null);

        context.parentData[fieldName] = isOtpActive;
      }

      function setOtpBackupFieldsData(counter, used) {
          context.parentData[AdpOtpHelper.const.BACKUP_COUNTER_FIELD_NAME] = counter;
          context.parentData[AdpOtpHelper.const.BACKUP_USED_FIELD_NAME] = used;
      }

      function enableOtp() {
        var login = isRegisterForm ? context.row.login : lsService.getUser().login;

        AdpModalService.createModal('adpOtpConfigControlDialogComponent', {isRegisterForm:isRegisterForm, login: login})
          .result
          .then(function (res) {
            res && setOtpFieldsData(true);
          })
          .catch(function () {
          });
      }

      function disableOtp() {
        var message = AdpOtpHelper.const.CONFIRM_DISABLE_MSG.replace('%label%', featureName.toLowerCase())

        AdpModalService.confirm({message: message})
          .then(function () {
            return AdpOtpHelper.request(null, AdpOtpHelper.url.disableOtp, {method: 'post'})
          })
          .then(function () {
            setOtpFieldsData(false);
          })
          .catch(function () {
          });
      }

      function showBackupCodes() {
        AdpModalService.createModal('adpOtpBackupCodesDialogComponent', {
          counter: context.parentData[AdpOtpHelper.const.BACKUP_COUNTER_FIELD_NAME],
          used: context.parentData[AdpOtpHelper.const.BACKUP_USED_FIELD_NAME]
        })
          .result
          .then(function (res) {
            res && setOtpBackupFieldsData(res.counter, res.used);
          })
          .catch(function () {
          });
      }

      function showAboutBackupImportance() {
        AdpModalService.alert({
          message: AdpOtpHelper.const.BACKUP_CODES_IMPORTANCE_MSG,
          sizeSmall: true,
        })
      }

      function getEnableDisableLabel(enable) {
         return AdpOtpHelper.const[enable ? 'IS_ENABLED' : 'IS_DISABLED'];
      }
    }
  }
})();
