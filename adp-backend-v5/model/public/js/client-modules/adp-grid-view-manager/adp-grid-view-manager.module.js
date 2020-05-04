(function () {
  angular.module('app.adpGridViewManager', []).factory('AdpGridViewManager', AdpGridViewManager);

  /** @ngInject */
  function AdpGridViewManager(AdpClientCommonHelper, AdpGridViewManagerService) {
    return function (toolbarWidgetRegister) {
      var schema = this.schema;
      var actionOptions = this.actionOptions;
      var customGridOptions = this.customGridOptions;

      toolbarWidgetRegister(function (gridComponent) {
        return {
          widget: 'dxMenu',
          options: AdpGridViewManagerService.createMenuOptions(schema, gridComponent, customGridOptions, actionOptions),
        };
      });
    };
  }
})();
