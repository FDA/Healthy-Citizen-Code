;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('DxStringConfig', DxStringConfig);

  /** @ngInject */
  function DxStringConfig() {
    return function (args) {
      var type = args.fieldSchema.type;
      var cfg = { mode: getInputType(args.fieldSchema.type) };

      if (type === 'Phone') {
        _.assign(cfg, {
          mask: 'X00-X00-0000',
          maskRules: { X: /[02-9]/ },
          maskChar: 'x',
          maskInvalidMessage: false,
          showMaskMode: 'onFocus',
        })
      }

      return {
        options: cfg,
        widgetName: 'dxTextBox',
      };
    }

    function getInputType(type) {
      var types = {
        'Email': 'email',
        'PasswordAuth': 'password',
        'Url': 'url',
      };

      return types[type] || 'text';
    }
  }

})();
