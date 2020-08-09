;(function () {
  'use strict';

  angular
    .module('app.hcForms')
    .factory('HcFieldsService', HcFieldsService);

  function HcFieldsService (
    HcSchemaService
  ) {
    var typeMap = {
      'String': { uiSubtypeType: 'text', directiveType: 'string' },
      'String:Url': { uiSubtypeType: 'text', directiveType: 'string' },
      'String:Email': { uiSubtypeType: 'email', directiveType: 'string' },
      'String:Password': { uiSubtypeType: 'password', directiveType: 'string' },
      'String[]': { directiveType: 'select-multiple' },
      'Select': { directiveType: 'select' },
      'Date': { directiveType: 'date' },
      'Number': { uiSubtypeType: 'number', directiveType: 'string' },
      'Number:ImperialHeight': { directiveType: 'imperial-height' },
      'Number:ImperialWeight': { uiSubtypeType: 'number', directiveType: 'string' },
      'Search': { directiveType: 'lookup' },
      'Search[]': { directiveType: 'lookup-multiple' },
      'Boolean': { uiType: 'checkbox', directiveType: 'checkbox' },
      'String:Recaptcha': { directiveType: 'recaptcha' },
      'ObjectID': { directiveType: 'parent-select' }
    };

    // public
    function getTypeProps(field) {
      var fieldType = HcSchemaService.getTypeProps(field);

      return typeMap[fieldType];
    }

    // public
    function getFormFields(fields) {
      return _.chain(_.clone(fields))
        .map(prepareData)
        .filter(function (field) { return !('fields' in field) && getTypeProps(field); })
        .value();
    }

    function prepareData(field, key) {
      field.keyName = key;
      field.required = !!field.required;

      return field;
    }

    function listToArray(list) {
      return _.map(list, function (value, key) {
        return {value: key, label: value}
      })
    }

    return {
      getTypeProps: getTypeProps,
      getFormFields: getFormFields,
      listToArray: listToArray
    };
  }
})();
