;(function() {
  'use strict';

  angular
    .module('app.hcCommon')
    .service('HcSchemaService', HcSchemaService);

  /** @ngInject */
  function HcSchemaService (
    SCHEMAS,
    $state
  ) {
    function getCurrentSchema() {
      var pageParams = getPageParams();

      return _.clone(_.get(SCHEMAS, pageParams.schemaPath))
    }

    function getParentSchema() {
      var pageParams = getParentPageParams();

      return _.clone(_.get(SCHEMAS, pageParams.schemaPath));
    }

    function getPageParams() {
      return _.clone($state.current.data.pageParams);
    }

    function getParentPageParams() {
      var pageParams = getPageParams();
      var parentState = $state.get(pageParams.parentStateName);

      return _.clone(parentState.data.pageParams);
    }

    // hardcode
    function getLoginSchema() {
      var login = _.cloneDeep(SCHEMAS['users']['fields']['login']);
      var password = _.cloneDeep(SCHEMAS['users']['fields']['password']);

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
      var login = _.cloneDeep(SCHEMAS['users']['fields']['login']);
      var email = SCHEMAS['users']['fields']['email'];
      var password = _.cloneDeep(SCHEMAS['users']['fields']['password']);
      // FIXME: remove after password validation fixed
      password.validate = password.validate.slice(1);
      var passwordConfirmation = _.cloneDeep(password);

      passwordConfirmation.fullName = 'Password confirm';
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

    function getTypeProps (field) {
      if (!field) return;

      var type = field.type;
      var subtype = ('subtype' in field) ? field.subtype : null;
      var fieldType = subtype ? [type, subtype].join(':') : type;

      // exceptions
      if ('lookup' in field) {
        fieldType = fieldType === 'ObjectID[]' ? 'Search[]' : 'Search';
      }

      // exceptions
      if ('list' in field) {
        fieldType = fieldType === 'String[]' ? 'String[]' : 'Select';
      }

      return fieldType;
    }

    return {
      getLoginSchema: getLoginSchema,
      getRegisterSchema: getRegisterSchema,
      getTypeProps: getTypeProps,
      getCurrentSchema: getCurrentSchema,
      getPageParams: getPageParams,
      getParentPageParams: getParentPageParams,
      getParentSchema: getParentSchema
    }
  }
})();
