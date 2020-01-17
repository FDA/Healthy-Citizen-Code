;(function() {
  'use strict';

  /**
   * @ng-service
   * Backend does not provide schema for Login, SignUp pages and for
   * type=Password field.
   *
   * Service provides hardcoded schemas for such pages until Backend
   * implements it.
   */
  angular
    .module('app.adpCommon')
    .service('AdpAuthSchemas', AdpAuthSchemas);

  /** @ngInject */
  function AdpAuthSchemas() {
    function login() {
      var password = getPasswordModelField();
      removeRegexValidator(password);
      var loginField = getModelField('login');
      loginField.fullName = 'Login or Email';
      _.unset(loginField, 'validate');

      return {
        type: 'Schema',
        fields: {
          login: loginField,
          password: password,
          recaptcha: getRecaptchaField(),
        }
      }
    }

    function register() {
      return {
        type: 'Schema',
        fields: {
          login: getModelField('login'),
          email: getModelField('email'),
          password: getPasswordModelField(),
          passwordConfirmation: getPasswordConfirmation(),
          recaptcha: getRecaptchaField(),
        }
      }
    }

    function forgot() {
      return {
        type: 'Schema',
        fields: {
          email: getModelField('email'),
          recaptcha: getRecaptchaField(),
        }
      }
    }

    function reset() {
      return {
        type: 'Schema',
        fields: {
          password: getPasswordModelField(),
          passwordConfirmation: getPasswordConfirmation(),
        }
      }
    }

    function password() {
      var password = getPasswordModelField();
      removeRegexValidator(password);

      return {
        type: 'Schema',
        fields: {
          password: password,
          passwordConfirmation: getPasswordConfirmation(),
        }
      }
    }

    function getModelField(fieldName) {
      var APP_MODEL = window.adpAppStore.appModel();
      var path = fieldPath(fieldName);
      var field = _.cloneDeep(_.get(APP_MODEL, path));
      addReadWritePermissions(field);
      field.showInForm = true;

      return field;
    }

    function getPasswordModelField() {
      var field = getModelField('password');
      field.type = 'PasswordAuth';

      return field;
    }

    function fieldPath(fieldName) {
      var PATH_PREFIX = 'users.fields.';
      return PATH_PREFIX + fieldName;
    }

    function addReadWritePermissions(field) {
      field.fieldInfo = { write: true, read: true };
    }

    function getPasswordConfirmation() {
      var field = getPasswordModelField();

      field.fullName = 'Verify Password';
      field.validate = [
        {
          validator: 'passwordMatch',
          arguments: {
            matchedField: 'password'
          },
          errorMessages: {
            default: 'Passwords do not match'
          }
        }
      ];

      return field;
    }

    function getRecaptchaField() {
      var field = {
        type: 'Recaptcha',
        fullName: 'Recaptcha',
        showInForm: true,
        required: true,
      };

      addReadWritePermissions(field);

      return field;
    }

    // check for details https://jira.conceptant.com/browse/HC-1362
    function removeRegexValidator(field) {
      var validatorIndex = _.findIndex(field.validate, function (o) {
        return o.validator === 'regex'
      });

      if (validatorIndex > -1) {
        field.validate.splice(validatorIndex, 1);
      }
    }

    return {
      login: login,
      register: register,
      password: password,
      forgot: forgot,
      reset:reset
    }
  }
})();
