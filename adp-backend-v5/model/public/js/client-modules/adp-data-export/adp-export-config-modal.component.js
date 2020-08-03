(function () {
  'use strict';

  angular.module('app.adpDataExport').component('adpExportConfigModal', {
    template:
      '<adp-form ' +
      '  args="vm.args"' +
      '  form-options="vm.formOptions">' +
      '    <form-header>' +
      '        <h2 class="semi-bold">{{vm.data.name}}</h2>' +
      '    </form-header>' +

      '    <form-footer>' +
            '<footer class="adp-action-b-container">' +
      '        <button' +
      '                class="adp-action-b-secondary"' +
      '                type="button"' +
      '                ng-click="vm.cancel()">' +
      '            Cancel' +
      '        </button>' +
      '        <button' +
      '                type="submit"' +
      '                class="adp-action-b-primary">' +
      '            Export' +
      '        </button>' +
            '</footer>' +
      '    </form-footer>' +
      '</adp-form>',
    bindings: {
      resolve: '<',
      close: '&',
      dismiss: '&',
    },
    controller: 'AdpExportConfigModalController',
    controllerAs: 'vm',
  });
})();
