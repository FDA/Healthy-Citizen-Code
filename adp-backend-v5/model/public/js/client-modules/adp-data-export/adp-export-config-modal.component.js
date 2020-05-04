(function () {
  'use strict';

  angular.module('app.adpDataExport').component('adpExportConfigModal', {
    template:
      '<adp-form' +
      '        class="login-form auth-form"' +
      '        enable-selector="false"' +
      '        adp-submit="vm.submit"' +
      '        adp-fields="vm.fields"' +
      '        adp-data="vm.data"' +
      '        schema="vm.schema"' +
      '        disable-fullscreen="true"' +
      '>' +
      '    <form-header>' +
      '        <h2 class="semi-bold">{{vm.data.name}}</h2>' +
      '    </form-header>' +
      '' +
      '    <form-footer>' +
      '        <button' +
      '                type="submit"' +
      '                class="btn btn-primary">' +
      '            Export' +
      '        </button>' +
      '        <button' +
      '                class="btn btn-default"' +
      '                type="button"' +
      '                ng-click="vm.cancel()">' +
      '            Cancel' +
      '        </button>' +
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
