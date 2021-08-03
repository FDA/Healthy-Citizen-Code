;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('DxIntConfig', DxIntConfig);

  /** @ngInject */
  function DxIntConfig(DxNumberHelper) {
    return function () {
      var INT_FORMAT = '#';
      var ZERO_KEY_CODE = 48;

      // refer to dx issue for more details
      // https://supportcenter.devexpress.com/ticket/details/t687373/numberbox-it-is-impossible-to-enter-0-if-the-mask-is-used
      return {
        options: {
          showSpinButtons: true,
          onKeyDown: function (e) {
            var zeroOrEmpty = _.includes([null, 0], e.component.option('value'));
            if(e.event.keyCode === ZERO_KEY_CODE && zeroOrEmpty){
              e.component.option('format', '');
            } else {
              e.component.option('format', INT_FORMAT);
            }
          },
          onFocusOut: function (e) {
            // resetting format on TAB_KEY
            e.component.option('format', '');
          },
          onValueChanged: function (e) {
            if (e.event.type === 'dxmousewheel') {
              return DxNumberHelper.preventMouseWheel(e);
            }

            if (e.value !== 0) {
              e.component.option('format', INT_FORMAT);
            }
          },
        },
        widgetName: 'dxNumberBox',
      };
    }
  }
})();
