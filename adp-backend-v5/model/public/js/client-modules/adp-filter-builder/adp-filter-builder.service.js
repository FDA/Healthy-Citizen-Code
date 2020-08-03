(function () {
  'use strict';

  angular.module('app.adpFilterBuilder').factory('AdpFilterBuilder', AdpFilterBuilder);

  /** @ngInject */
  function AdpFilterBuilder(
    AdpClientCommonHelper,
    AdpModalService
  ) {
    return function (toolbarWidgetRegister) {
      var schema = this.schema;
      var actionOptions = this.actionOptions;
      var customOptions = this.customGridOptions;

      return toolbarWidgetRegister(function (gridComponent) {
        return {
          widget: "dxMenu",
          options: {
            dataSource: [{template: AdpClientCommonHelper.getMenuItemTemplate(actionOptions)}],
            cssClass: "adp-toolbar-menu grid-view-menu",
            onItemClick: function (event) {
              AdpModalService
                .createModal("adpFilterBuilder", {
                  schema: schema,
                  grid: customOptions.gridComponent,
                  value: customOptions.value('filterBuilder'),
                }).result.then(function (res) {
                if (res) {
                  customOptions.value('filterBuilder', res.length ? res : null);
                }
                gridComponent.refresh();
              });

              AdpClientCommonHelper.repaintToolbar(gridComponent);
              return true;
            },
            onInitialized: function(event){
              highlightButton(event);

              customOptions.setOrReplaceHandler('change:filterBuilder', 'filterBuilder', function(){
                highlightButton(event);
              })
            }
          },
        };

        function highlightButton(event){
          var filterBuilder = customOptions.value('filterBuilder');
          var isHl = filterBuilder && filterBuilder.length;

          AdpClientCommonHelper.highlightToolbarButton(event.component, isHl);
        }
      })
    };
  }
})();
