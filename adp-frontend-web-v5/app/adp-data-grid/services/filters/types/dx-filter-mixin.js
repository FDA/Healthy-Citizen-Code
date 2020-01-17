;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('DxFilterMixin', DxFilterMixin);

  /** @ngInject */
  function DxFilterMixin() {
    return function (options) {
      var mixinObject = {
        reset: function() {
          var instance = this.getInstance();
          instance.reset();
        },

        getInstance: function () {
          return $(this.element)[this.editorName]('instance');
        },

        getElement: function () {
          return this.element;
        },

        getValue: function () {
          return this.getInstance().option('value');
        }
      };

      return _.assign(mixinObject, options);
    }
  }
})();
