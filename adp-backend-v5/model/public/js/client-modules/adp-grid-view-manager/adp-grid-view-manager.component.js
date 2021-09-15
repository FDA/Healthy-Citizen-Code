(function () {
  'use strict';

  angular.module('app.adpGridViewManager').component('adpGridViewManager', {
    template:
      '<form name="form"' +
      '      class="smart-form client-form grid-view-manager">' +
      '    <header class="smart-form-header">' +
      '        <h2 class="semi-bold">Grid View manager</h2>' +
      '    </header>' +
      '' +
      '    <fieldset>' +
      '        <div class="col col-12">' +
      '            <div class="gvm-items-list">' +
      '                <div ng-repeat="item in vm.savedList" class="gvm-list-item" data-item-id="{{item._id}}">' +
      "                    <div class='gvm-text'>{{ item.name }}</div>" +
      '                    <div class=\'gvm-delete\' ng-click="vm.delete($event)">' +
      '                        <i class="dx-icon dx-icon-trash"></i>' +
      '                    </div>' +
      '                </div>' +
      '            </div>' +
      '            <i ng-if="!vm.savedList || !vm.savedList.length">No saved states for this grid.</i>' +
      '        </div>' +
      '    </fieldset>' +
      '    <footer class="adp-action-b-container" adp-ui-buttons-handle-keyboard>' +
      '        <button class="adp-action-b-secondary"' +
      '                type="button"' +
      '                ng-click="vm.exit()">' +
      '            Close' +
      '        </button>' +
      '        <button class="adp-action-b-primary"' +
      '                type="button"' +
      '                ng-click="vm.save()">' +
      '            Save Current Grid View' +
      '        </button>' +
      '    </footer>' +
      '</form>',
    bindings: {
      resolve: '<',
      close: '&',
      dismiss: '&',
    },
    controller: 'AdpGridViewManagerController',
    controllerAs: 'vm',
  });
})();
