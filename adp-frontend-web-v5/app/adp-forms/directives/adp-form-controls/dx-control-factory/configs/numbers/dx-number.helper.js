;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('DxNumberHelper', DxNumberHelper);

  /** @ngInject */
  function DxNumberHelper() {
    return {
      preventMouseWheel: function () {
        var suspendValueChanged;

        return function (e) {
          if (e.event.type === 'dxmousewheel') {
            if (suspendValueChanged) {
              suspendValueChanged = false;
              return false;
            }

            suspendValueChanged = true;
            e.component.option('value', e.previousValue);
          }
        }
      }
    };
  }

})();
