;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .factory('NumberArrayEditorConfig', NumberArrayEditorConfig);

  /** @ngInject */
  function NumberArrayEditorConfig(StringArrayEditorConfig) {
    return function (args, initialValue, onValueChangeCb) {
      var baseConfig = StringArrayEditorConfig(args, initialValue, onValueChangeCb);

      var prevCb = baseConfig.onValueChanged;
      baseConfig.onValueChanged = function (e) {
        prevCb(e);
        setComponentClass(e);
      }

      var numberEditorConfig = { onInitialized: setComponentClass };

      return _.merge(baseConfig, numberEditorConfig);
    }

    function setComponentClass(e) {
      var value = e.component.option('value');
      e.element.toggleClass('not-empty', !_.isEmpty(value));
    }
  }
})();
