(function () {
  'use strict';

  angular.module('app.adpGridViewManager').factory('AdpGridViewManagerService', AdpGridViewManagerService);

  /** @ngInject */
  function AdpGridViewManagerService(
    AdpClientCommonHelper,
    GridOptionsHelpers,
    AdpNotificationService,
    AdpModalService,
    AdpSchemaService,
    GridColumns,
    filterUrlMapper,
    GraphqlCollectionQuery,
    GraphqlCollectionMutator,
    ErrorHelpers
  ) {
    var storeSchema = AdpSchemaService.getSchemaByName('dxGridViews');

    return {
      loadViews: loadViews,
      saveView: saveView,
      createMenuOptions: createMenuOptions,
    };

    function createMenuOptions(schema, gridComponent, customGridOptions, actionOptions) {
      var menuActions = {
        reset: doReset,
        save: doSave,
        restore: doRestore,
        manage: doOpenManager,
      };
      var menuComponent = null;
      var cachedList = null;

      return {
        dataSource: getMenuDataSource(),
        displayExpr: 'name',
        cssClass: 'adp-toolbar-menu grid-view-menu',
        onInitialized: onInit,
        onItemClick: onItemClick,
      };

      function onInit(e) {
        menuComponent = e.component;
      }

      function doSave() {
        saveView(gridComponent, customGridOptions, cachedList, schema).then(function () {
          AdpNotificationService.notifySuccess('Grid view is saved');
          return doLoadList();
        });
      }

      function doRestore(itemData) {
        var id = itemData._id;

        if (id) {
          var record = getSavedItemById(cachedList, id);

          setStateToGrid(gridComponent, record.state);
          AdpNotificationService.notifySuccess('Grid view is restored');
          customGridOptions.value(record.state._customOptions || {});

          filterUrlMapper(gridComponent, schema);
        }
      }

      function doReset() {
        return AdpModalService.confirm({
          message: 'Are you sure that you want to reset grid to default view?',
          sizeSmall: true,
        }).then(function () {
          var options = _.cloneDeep(schema.parameters);

          GridColumns(options, schema);
          gridComponent.state({ columns: options.columns });
          customGridOptions.value('quickFilterId', '');

          AdpNotificationService.notifySuccess('Grid view has been reset');

          filterUrlMapper(gridComponent, schema);
        });
      }

      function doOpenManager() {
        AdpModalService.createModal('adpGridViewManager', {
          list: cachedList,
          grid: gridComponent,
          customGridOptions: customGridOptions,
          schema: schema,
        }).result.then(function (res) {
          cachedList = res.newList;
          updateMenu(cachedList);
        });
      }

      function doLoadList() {
        return loadViews(schema).then(function (list) {
          cachedList = list;
          updateMenu(list);
        });
      }

      function updateMenu(list) {
        menuComponent.option('dataSource', getMenuDataSource(list));
      }

      function getMenuDataSource(cachedList) {
        var functionalItems = [
          {
            name: 'Reset View ...',
            icon: 'undo',
            action: 'reset',
          },
          {
            name: 'Save Current Grid View ...',
            icon: 'save',
            action: 'save',
          },
          {
            name: 'Manage Grid Views ...',
            icon: 'detailslayout',
            disabled: !cachedList || !cachedList.length,
            action: 'manage',
          },
          {
            template: function () {
              return $("<span class='menu-separator'>");
            },
            disabled: true,
          },
        ];
        var savedItems = cachedList
          ? _.map(cachedList, function (item) {
              return {
                name: item.name,
                _id: item._id,
                action: 'restore',
              };
            })
          : [];

        return [
          {
            template: AdpClientCommonHelper.getMenuItemTemplate(actionOptions),
            items: _.union(functionalItems, savedItems),
          },
        ];
      }

      function onItemClick(e) {
        var action = e.itemData.action;

        if (action && menuActions[action]) {
          menuActions[action](e.itemData);
        } else {
          if (!cachedList) {
            doLoadList().then(function(){
              $(e.element)
                .find('.dx-menu-item')
                .eq(0)
                .trigger('dxclick');
            });
          }
        }

        return true;
      }
    }

    function loadViews(schema) {
      var params = {
        filter: [['model', '=', schema.schemaName]],
        skip: 0,
        take: 1000,
      };

      return GraphqlCollectionQuery(storeSchema, params)
        .then(function (result) {
          return result.items;
        })
        .catch(function (error) {
          ErrorHelpers.handleError(error, 'Unknown error while loading list of grid views');
          throw error;
        });
    }

    function saveView(grid, customGridOptions, cachedList, schema) {
      var state = getStateFromGrid(grid);

      state._customOptions = customGridOptions.value();

      return AdpModalService.prompt({
        title: 'Save Grid View as:',
        sizeSmall: true,
        validate: function (value) {
          if (
            _.find(cachedList, function (item) {
              return item.name === value;
            })
          ) {
            return 'This name is already in use';
          }
          if (!value) {
            return 'Please enter record name';
          }
        },
      }).then(function (name) {
        return createRecord(state, name, schema);
      });
    }

    function createRecord(gridState, name, schema) {
      var record = { model: schema.schemaName, state: gridState, name: name };

      return GraphqlCollectionMutator.create(storeSchema, record).catch(function (error) {
        ErrorHelpers.handleError(error, 'Unknown error while saving grid view');
        throw error;
      });
    }

    function getStateFromGrid(grid) {
      var state = grid.state();

      delete state.searchText;

      return state;
    }

    function setStateToGrid(grid, data) {
      return grid.state(data);
    }

    function getSavedItemById(list, id) {
      return _.find(list, function (item) {
        return item._id === id;
      });
    }
  }
})();
