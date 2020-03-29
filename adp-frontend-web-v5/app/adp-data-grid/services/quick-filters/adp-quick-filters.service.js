;(function () {
  "use strict";

  angular
    .module("app.adpCommon")
    .factory("AdpQuickFiltersService", AdpQuickFiltersService);

  /** @ngInject */
  function AdpQuickFiltersService(
    AdpNotificationService,
    AdpModalService,
    AdpSchemaService,
    GridColumns,
    filterUrlMapper,
    GraphqlCollectionQuery,
    GraphqlCollectionMutator,
    ErrorHelpers
  ) {
    var storeSchema = AdpSchemaService.getSchemaByName("quickFilters");

    return {
      createMenu: createMenu
    };

    function createMenu(schema, gridComponent, customGridOptions) {
      var menuActions = {
        reset: doReset,
        apply: doApply,
      };
      var menuComponent = null;
      var savedList = [];

      return {
        dataSource: getMenuDataSource(),
        displayExpr: "name",
        cssClass: "adp-toolbar-menu grid-view-menu",
        hint: "Quick filters",
        onInitialized: onInit,
        onItemClick: onItemClick
      };

      function onInit(e) {
        menuComponent = e.component;
        customGridOptions.setHandler('change', 'quickFilterId', onFilterIdChange);
        doLoadList();
      }

      function onFilterIdChange() {
        updateMenu(savedList);
      }

      function doApply(itemData) {
        setUserData(itemData._id);
      }

      function doReset() {
        setUserData();
      }

      function setUserData(val) {
        var store = gridComponent.getDataSource();

        customGridOptions.value('quickFilterId', val || '');
        updateMenu(savedList);

        store.reload();
      }

      function doLoadList() {
        loadFilters(schema)
          .then(
            function (list) {
              savedList = list;
              updateMenu(list);
            })
      }

      function updateMenu(list) {
        menuComponent.option({
          dataSource: getMenuDataSource(list),
        });

        menuComponent.element()
          .toggleClass("adp-activated", !!customGridOptions.value('quickFilterId'));
      }

      function onItemClick(e) {
        var action = e.itemData.action;

        if (action && menuActions[action]) {
          menuActions[action](e.itemData);
        }

        return true;
      }

      function getMenuDataSource(savedList) {
        var savedItems = savedList ?
          _.map(savedList, function (item) {
            return {
              name: item.name,
              _id: item._id,
              icon: customGridOptions.value('quickFilterId') === item._id ? "check" : "none",
              action: "apply",
            }
          }) : [];
        var bottomItems = [
          {
            template: function () {
              return $("<span class='menu-separator'>")
            },
            disabled: true
          },
          {
            name: "None",
            icon: customGridOptions.value('quickFilterId') ? "none" : "check",
            action: "reset"
          },
        ];

        return [{
          icon: "filter",
          items: _.union(savedItems, bottomItems),
        }];
      }
    }

    function loadFilters(schema) {
      var params = {
        filter: [["model", "=", schema.schemaName]],
        skip: 0,
        take: 1000
      };

      return GraphqlCollectionQuery(storeSchema, params)
        .then(
          function (result) {
            return result.items
          }
        )
        .catch(function (error) {
          ErrorHelpers.handleError(error, "Unknown error while loading quick filters list");
          throw error;
        });
    }
  }
})();
