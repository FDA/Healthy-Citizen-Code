;(function () {
  'use strict';

  angular
    .module('app.adpCommon')
    .controller('AdpGridViewManagerController', AdpGridViewManagerController);

  /** @ngInject */
  function AdpGridViewManagerController(
    AdpNotificationService,
    AdpModalService,
    AdpSchemaService,
    GridColumns,
    filterUrlMapper,
    GraphqlCollectionQuery,
    GraphqlCollectionMutator,
    ErrorHelpers,
    $scope
  ) {
    var vm = this;

    vm.storeSchema = AdpSchemaService.getSchemaByName('dxGridViews');

    vm.$onInit = doInit;
    vm.save = doSaveState;
    vm.restore = doRestoreState;
    vm.delete = doDeleteState;
    vm.reset = doResetState;
    vm.close = function () {
      vm.dismiss();
    };

    function doInit() {
      vm.options = vm.resolve.options;

      vm.schema = vm.options.schema;
      vm.modelName = vm.schema.schemaName;
      vm.gridComponent = vm.options.gridComponent;

      loadSavedStatesList();
    }

    function doSaveState() {
      var state = getStateFromGrid();

      AdpModalService.prompt({
        title: 'Name saved state:',
        sizeSmall: true,
        validate: function (value) {
          if (_.find(vm.savedList, function (item) {
            return item.name === value
          })) {
            return 'This name is already in use'
          }
          if (!value) {
            return 'Please enter record name'
          }
        }
      }).then(
        function (name) {
          createStateRecord(state, name).then(
            function () {
              AdpNotificationService.notifySuccess("Current grid state is saved as '" + name + "'!");
              return loadSavedStatesList();
            });
        })
    }

    function doRestoreState($event) {
      var id = getClickedRecordId($event);

      if (id) {
        var record = getSavedItemById(id);

        setStateToGrid(record.state);
        AdpNotificationService.notifySuccess("State is restored from '" + record.name + "'!");

        filterUrlMapper(vm.gridComponent, vm.schema);
        vm.close();
      }
    }

    function doDeleteState($event) {
      var id = getClickedRecordId($event);

      if (id) {
        var record = getSavedItemById(id);

        deleteStateRecord(id, record.name).then(function () {
          AdpNotificationService.notifySuccess("Item '" + record.name + "' is removed successfully");
          loadSavedStatesList();
        });
      }
    }

    function doResetState() {
      return AdpModalService.confirm({
        message: 'Are you sure that you want to reset grid to default state?',
      }).then(function () {
        var options = _.cloneDeep(vm.schema.parameters);

        GridColumns.create(options, vm.schema);
        vm.gridComponent.state({columns: options.columns});

        AdpNotificationService.notifySuccess('Grid has been reset to default state');

        filterUrlMapper(vm.gridComponent, vm.schema);
        vm.close();
      });
    }

    function loadSavedStatesList() {
      var params = {
        filter: [["model", "=", vm.modelName]],
        skip: 0,
        take: 1000
      };

      return GraphqlCollectionQuery(vm.storeSchema, params)
        .then(
          function (result) {
            return result.items
          }
        ).then(
          function (list) {
            vm.savedList = list;
            $scope.$applyAsync();
          })
        .catch(function (error) {
          ErrorHelpers.handleError(error, 'Unknown error while loading list of saved state');
          throw error;
        });
    }

    function deleteStateRecord(id, name) {
      return AdpModalService.confirm({
        message: "Are you sure you want to delete '" + name + "' stored state?",
        sizeSmall: true
      }).then(
        function () {
          return GraphqlCollectionMutator.delete(vm.storeSchema, {_id: id})
            .catch(function (error) {
              ErrorHelpers.handleError(error, 'Unknown error while deleting saved state');
              throw error;
            });
        });
    }

    function createStateRecord(gridState, name) {
      var record = {model: vm.modelName, state: gridState, name: name};

      return GraphqlCollectionMutator.create(vm.storeSchema, record)
        .catch(function (error) {
          ErrorHelpers.handleError(error, 'Unknown error while creating saved state');
          throw error;
        });
    }

    function getStateFromGrid() {
      return vm.gridComponent.state().columns
    }

    function setStateToGrid(data) {
      var curState = vm.gridComponent.state();
      curState.columns = data;

      return vm.gridComponent.state(curState);
    }

    function getClickedRecordId(event) {
      return $(event.currentTarget).closest('.gvm-list-item').data('itemId');
    }

    function getSavedItemById(id) {
      return _.find(vm.savedList, function (item) {
        return item._id === id
      });
    }
  }
})();
