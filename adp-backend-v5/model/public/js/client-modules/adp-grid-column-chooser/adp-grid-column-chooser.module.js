(function () {
  angular.module('app.adpGridColumnChooser', []).factory('AdpGridColumnChooser', AdpGridColumnChooser);

  /** @ngInject */
  function AdpGridColumnChooser(AdpClientCommonHelper) {
    return function (toolbarWidgetRegister) {
      var actionOptions = this.actionOptions;
      var schema = this.schema;

      this.gridOptions.columnChooser = { enabled: true };

      // Disabling default columnChooser is not an option as some functionality will be broken.
      // Default button is filtered out from toolbar.
      return toolbarWidgetRegister(function (gridComponent) {
        return {
          widget: 'dxMenu',
          options: createMenu(schema, gridComponent, actionOptions),
        };
      });
    };

    function createMenu(schema, gridComponent, actionOptions) {
      var menuActions = {
        show: doToggleAll(true),
        hide: doToggleAll(false),
        choose: doShowChooser,
      };

      return {
        dataSource: getMenuDataSource(),
        displayExpr: 'name',
        cssClass: 'column-chooser-menu',
        onItemClick: onItemClick,
      };

      function doToggleAll(visibility) {
        return function () {
          gridComponent.beginUpdate();

          for (var i = 0; i < gridComponent.columnCount(); i++) {
            var field = gridComponent.columnOption(i, 'dataField');
            var name = gridComponent.columnOption(i, 'name');

            if (name !== 'actions') {
              if (!visibility || (schema.fields[field] && schema.fields[field].showInDatatable)) {
                gridComponent.columnOption(i, 'visible', visibility);
              }
            }
          }

          gridComponent.endUpdate();
        };
      }

      function doShowChooser() {
        return gridComponent.showColumnChooser();
      }

      function getMenuDataSource() {
        return [
          {
            template: AdpClientCommonHelper.getMenuItemTemplate(actionOptions),
            items: [
              {
                name: 'Show all',
                action: 'show',
              },
              {
                name: 'Hide all',
                action: 'hide',
              },
              {
                name: 'Choose columns ...',
                action: 'choose',
              },
            ],
          },
        ];
      }

      function onItemClick(e) {
        var action = e.itemData.action;

        if (action && menuActions[action]) {
          menuActions[action](e.itemData);
        }

        return true;
      }
    }
  }
})();
