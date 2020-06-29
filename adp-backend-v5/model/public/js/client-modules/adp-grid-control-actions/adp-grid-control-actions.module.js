(function () {
  angular.module('app.adpGridControlActions', []).factory('AdpGridControlActions', GridControlsActions);

  /** @ngInject */
  function GridControlsActions(AdpClientCommonHelper, AdpSchemaService, GraphqlCollectionQuery, ActionsHandlers) {
    return {
      edit: editAction,
      create: createAction,
    };

    function editAction(data, gridInstance) {
      var schema = getSchemaByName(this.row.$meta_table);
      var dataToUpdate = _.cloneDeep(data);
      _.unset(dataToUpdate, '_table');
      _.unset(dataToUpdate, '_tableLabel');
      _.unset(dataToUpdate, '$meta_table');

      return ActionsHandlers.update(schema, dataToUpdate).then(function () {
        gridInstance.refresh();
      });
    }

    function createAction() {
      return function (toolbarWidgetRegister) {
        var actionOptions = this.actionOptions;

        return toolbarWidgetRegister(function (gridComponent) {
          return {
            widget: 'dxMenu',
            options: {
              cssClass: 'create-grid-control',
              dataSource: createDataSourceForCreateActionMenu(actionOptions),
              showSubmenuMode: {
                name: 'onClick',
                delay: { show: 0, hide: 0 },
              },
              onItemClick: function onItemClick(e) {
                var schemaName = e.itemData.schemaName;
                if (!schemaName) {
                  return;
                }
                var schema = getSchemaByName(schemaName);

                ActionsHandlers.create(schema).then(function () {
                  gridComponent.refresh();
                });
              },
            },
          };
        });
      };
    }

    function createDataSourceForCreateActionMenu(actionOptions) {
      var className = 'btn page-action btn-primary';
      var tableNames = _.keys(actionOptions.table);
      var buttonText = tableNames.length === 1 ? 'Create "' + _.startCase(tableNames[0]) + '"' : 'Create record';

      var dataSource = [
        {
          template: '<button type="button" class="' + className + '">' + buttonText + '</button>',
        },
      ];

      if (tableNames.length === 1) {
        dataSource[0].schemaName = tableNames[0];
      } else {
        dataSource[0].items = _.map(actionOptions.table, function (table, name) {
          return {
            text: 'Create "' + _.startCase(name) + '"',
            schemaName: name,
          };
        });
      }

      return dataSource;
    }

    function getSchemaByName(name) {
      var APP_MODEL = window.adpAppStore.appModel();
      return _.cloneDeep(APP_MODEL[name]);
    }
  }
})();
