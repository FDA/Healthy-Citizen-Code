;(function () {
  "use strict";

  angular
    .module("app.adpCommon")
    .factory("AdpColumnChooserService", AdpColumnChooserService);

  /** @ngInject */
  function AdpColumnChooserService() {
    return {
      createMenu: createMenu,
    };

    function createMenu(schema, gridComponent) {
      var menuActions = {
        show: doToggleAll(true),
        hide: doToggleAll(false),
        choose: doShowChooser,
      };

      return {
        dataSource: getMenuDataSource(),
        displayExpr: "name",
        cssClass: "column-chooser-menu",
        onItemClick: onItemClick
      };

      function doToggleAll(visibility) {
        return function () {
          gridComponent.beginUpdate();

          for (var i = 0; i < gridComponent.columnCount(); i++) {
            var field = gridComponent.columnOption(i, "dataField");
            var name = gridComponent.columnOption(i, "name");

            if (name !== "actions") {
              if (!visibility || (schema.fields[field] && schema.fields[field].showInDatatable)) {
                gridComponent.columnOption(i, "visible", visibility);
              }
            }
          }

          gridComponent.endUpdate();
        }
      }

      function doShowChooser() {
        return gridComponent.showColumnChooser();
      }

      function getMenuDataSource() {
        return [{
          icon: "column-chooser",
          items: [
            {
              name: "Show all",
              action: "show"
            },
            {
              name: "Hide all",
              action: "hide"
            },
            {
              name: "Choose columns ...",
              action: "choose"
            }
          ]
        }];
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
