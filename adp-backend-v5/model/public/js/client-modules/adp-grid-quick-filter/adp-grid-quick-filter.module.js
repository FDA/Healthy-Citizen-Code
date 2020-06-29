(function () {
  angular.module('app.adpGridQuickFilter', []).factory('AdpGridQuickFilter', AdpGridQuickFilter);

  /** @ngInject */
  function AdpGridQuickFilter(AdpClientCommonHelper, AdpSchemaService, GraphqlCollectionQuery, ErrorHelpers) {
    var storeSchema = AdpSchemaService.getSchemaByName('quickFilters');

    return function (toolbarWidgetRegister) {
      var schema = this.schema;
      var actionOptions = this.actionOptions;
      var customGridOptions = this.customGridOptions;

      return toolbarWidgetRegister(function (gridComponent) {
        return {
          widget: 'dxMenu',
          options: createMenu(schema, gridComponent, customGridOptions, actionOptions),
        };
      });
    };

    function createMenu(schema, gridComponent, customGridOptions, actionOptions) {
      var menuActions = {
        reset: doReset,
        apply: doApply,
      };
      var menuComponent = null;
      var savedList = [];

      return {
        dataSource: getMenuDataSource(),
        displayExpr: 'name',
        cssClass: 'adp-toolbar-menu grid-view-menu',
        hint: 'Quick filters',
        onInitialized: onInit,
        onItemClick: onItemClick,
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
        loadFilters(schema).then(function (list) {
          savedList = list;
          updateMenu(list);
        });
      }

      function updateMenu(list) {
        menuComponent.option({
          dataSource: getMenuDataSource(list),
        });

        AdpClientCommonHelper.highlightToolbarButton(menuComponent.element(), customGridOptions.value('quickFilterId'))
      }

      function onItemClick(e) {
        var action = e.itemData.action;

        if (action && menuActions[action]) {
          menuActions[action](e.itemData);
        }

        return true;
      }

      function getMenuDataSource(savedList) {
        var menuItems = savedList
          ? _.map(savedList, function (item) {
              return {
                name: item.name,
                _id: item._id,
                icon: customGridOptions.value('quickFilterId') === item._id ? 'check' : 'none',
                action: 'apply',
              };
            })
          : [];

        if (menuItems.length) {
          menuItems.push({
            template: function () {
              return $("<span class='menu-separator'>");
            },
            disabled: true,
          });
        }

        menuItems.push({
          name: 'None',
          icon: customGridOptions.value('quickFilterId') ? 'none' : 'check',
          action: 'reset',
        });

        return [
          {
            template: AdpClientCommonHelper.getMenuItemTemplate(actionOptions),
            items: menuItems,
          },
        ];
      }
    }

    function loadFilters(schema) {
      var params = {
        filter: [],
        skip: 0,
        take: 1000,
      };

      return GraphqlCollectionQuery(storeSchema, params)
        .then(function (result) {
          return _.filter(result.items, getForModelName(schema.schemaName));
        })
        .catch(function (error) {
          ErrorHelpers.handleError(error, 'Unknown error while loading quick filters list');
          throw error;
        });
    }

    function getForModelName(modelName) {
      return function (row) {
        var models = row.model;
        var regexpMode = !models.match(/^[\w,]+$/);

        if (regexpMode) {
          try {
            return modelName.match(new RegExp(models));
          } catch (e) {
            return false;
          }
        } else {
          return _.indexOf(models.split(','), modelName) >= 0;
        }
      };
    }
  }
})();
