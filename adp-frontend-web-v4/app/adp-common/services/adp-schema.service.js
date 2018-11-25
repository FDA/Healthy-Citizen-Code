;(function() {
  'use strict';

  angular
    .module('app.adpCommon')
    .service('AdpSchemaService', AdpSchemaService);

  /** @ngInject */
  function AdpSchemaService ($state) {
    function getCurrentSchema() {
      var APP_MODEL = window.adpAppStore.appModel();
      var pageParams = getPageParams();

      return _.clone(_.get(APP_MODEL, pageParams.schemaPath));
    }

    function getParentSchema() {
      var APP_MODEL = window.adpAppStore.appModel();
      var pageParams = getParentPageParams();

      return _.clone(_.get(APP_MODEL, pageParams.schemaPath));
    }

    function getPageParams() {
      return _.clone($state.current.data.pageParams);
    }

    function getParentPageParams() {
      var pageParams = getPageParams();
      var parentState = $state.get(pageParams.parentStateName);

      return _.clone(parentState.data.pageParams);
    }

    function isField(field) {
      return field.type !== 'Schema' && field.type !== 'Subschema';
    }

    function isGroup(field) {
      return field.type === 'Group';
    }

    // hardcode
    function getLoginSchema() {
      var APP_MODEL = window.adpAppStore.appModel();
      var login = _.cloneDeep(APP_MODEL['users']['fields']['login']);
      var password = _.cloneDeep(APP_MODEL['users']['fields']['password']);
      password.subtype = 'PasswordAuth';

      login.fieldInfo = {
        write: true,
        read: true
      };

      // FIXME: remove after password validation fixed
      password.validate = password.validate.slice(1);
      login.visible = true;

      return {
        'login': login,
        'password': password,
        'recaptcha': {
          type: 'String',
          subtype: 'Recaptcha',
          fullName: 'Recaptcha',
          visible: true,
          required: true
        }
      }
    }

    // hardcode
    function getRegisterSchema() {
      var APP_MODEL = window.adpAppStore.appModel();
      var login = _.cloneDeep(APP_MODEL['users']['fields']['login']);
      var email = APP_MODEL['users']['fields']['email'];
      var password = _.cloneDeep(APP_MODEL['users']['fields']['password']);
      // FIXME: remove after password validation fixed
      password.subtype = 'PasswordAuth';
      password.validate = password.validate.slice(1);
      var passwordConfirmation = _.cloneDeep(password);

      passwordConfirmation.fullName = 'Verify Password';
      passwordConfirmation.validate = [
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

      login.visible = true;
      login.fieldInfo = {
        write: true,
        read: true
      };
      email.visible = true;

      return {
        'login': login,
        'email': email,
        'password': password,
        'passwordConfirmation': passwordConfirmation,
        'recaptcha': {
          type: 'String',
          subtype: 'Recaptcha',
          fullName: 'Recaptcha',
          visible: true,
          required: true
        }
      }
    }

    function getPasswordSchema() {
      var APP_MODEL = window.adpAppStore.appModel();
      var password = _.cloneDeep(APP_MODEL['users']['fields']['password']);
      password.subtype = 'PasswordAuth';

      var passwordConfirmation = _.cloneDeep(password);

      passwordConfirmation.fullName = 'Verify Password';
      passwordConfirmation.validate = [
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

      return {
        'password': password,
        'passwordConfirmation': passwordConfirmation
      }
    }

    function getTypeProps (field) {
      if (!field) return;

      var type = field.type;
      var subtype = ('subtype' in field) ? field.subtype : null;
      var fieldType = subtype ? [type, subtype].join(':') : type;

      // exceptions
      if ('list' in field) {
        fieldType = field.type.indexOf('[]') > -1 ? 'SelectMultiple' : 'Select';
      }

      if (field.subtype === 'DynamicList') {
        fieldType = field.type.indexOf('[]') > -1 ? 'DynamicList[]' : 'DynamicList';
      }

      return fieldType;
    }

    return {
      getLoginSchema: getLoginSchema,
      getRegisterSchema: getRegisterSchema,
      getPasswordSchema: getPasswordSchema,
      getTypeProps: getTypeProps,
      getCurrentSchema: getCurrentSchema,
      getPageParams: getPageParams,
      getParentPageParams: getParentPageParams,
      getParentSchema: getParentSchema,
      isField: isField,
      isGroup: isGroup,
    }
  }
})();
