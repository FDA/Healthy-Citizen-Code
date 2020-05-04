(function () {
  'use strict';

  angular.module('app.adpGridViewManager').controller('AdpGridViewManagerController', AdpGridViewManagerController);

  /** @ngInject */
  function AdpGridViewManagerController(
    AdpNotificationService,
    AdpModalService,
    AdpSchemaService,
    AdpGridViewManager,
    GraphqlCollectionMutator,
    ErrorHelpers
  ) {
    var vm = this;

    vm.storeSchema = AdpSchemaService.getSchemaByName('dxGridViews');

    vm.$onInit = doInit;
    vm.delete = doDeleteState;
    vm.save = doSaveState;
    vm.exit = function () {
      vm.close({ $value: { newList: vm.savedList } });
    };

    function doInit() {
      vm.options = vm.resolve.options;
      vm.savedList = vm.options.list;
    }

    function doSaveState() {
      AdpGridViewManager.saveView(vm.options.grid, vm.options.customGridOptions, vm.savedList, vm.options.schema)
        .then(function () {
          AdpNotificationService.notifySuccess('Grid view is saved');
          return AdpGridViewManager.loadViews(vm.options.schema);
        })
        .then(function (list) {
          vm.savedList = list;
        });
    }

    function doDeleteState($event) {
      var id = getClickedRecordId($event);

      if (id) {
        var record = getSavedItemById(id);

        deleteStateRecord(id, record.name).then(function () {
          AdpNotificationService.notifySuccess("Item '" + record.name + "' is removed successfully");
          removeFromSavedById(id);
        });
      }
    }

    function deleteStateRecord(id, name) {
      return AdpModalService.confirm({
        message: "Are you sure you want to delete '" + name + "' stored state?",
        sizeSmall: true,
      }).then(function () {
        return GraphqlCollectionMutator.delete(vm.storeSchema, { _id: id }).catch(function (error) {
          ErrorHelpers.handleError(error, 'Unknown error while deleting saved state');
          throw error;
        });
      });
    }

    function getClickedRecordId(event) {
      return $(event.currentTarget).closest('.gvm-list-item').data('itemId');
    }

    function getSavedItemById(id) {
      return _.find(vm.savedList, function (item) {
        return item._id === id;
      });
    }

    function removeFromSavedById(id) {
      return (vm.savedList = _.filter(vm.savedList, function (item) {
        return item._id !== id;
      }));
    }
  }
})();
