(function () {
  'use strict';

  angular.module('app.adpDataExport')
    .component('adpExportStatusModal', {
      template:
        '<form name="form"' +
        '      class="smart-form client-form export-status">' +
        '    <header class="smart-form-header">' +
        '        <h2 class="semi-bold">Export' +
        '            <span ng-if="vm.status === \'start\'" class="">has started...</span>' +
        '            <span ng-if="vm.status === \'long\'" class="">takes too long...</span>' +
        '            <span ng-if="vm.status === \'finish\'" class="">is finished</span>' +
        '            <span ng-if="vm.status === \'error\'" class="">is failed</span>' +
        '        </div>' +
        '</h2>' +
        '    </header>' +
        '    <fieldset>' +
        '        <div class="col col-12">' +
        '            <div ng-if="vm.status === \'start\'" class=""><i class="fa fa-circle-o-notch fa-4x fa-spin"></i></div>' +
          '            <div ng-if="vm.status === \'finish\'" class="">Successfully</div>' +
        '            <div ng-if="vm.showResultsCollection"><a href="/_exports">You can get export result here then its ready</a></div>' +
        '            <div ng-if="vm.status === \'error\'" class="">' +
        '               <div>{{ vm.errorMessage }}</div>' +
        '            </div>' +
        '        </div>' +
        '    </fieldset>' +
        '    <footer class="adp-action-b-container">' +
        '        <button class="adp-action-b-primary"' +
        '                type="button"' +
        '                ng-if="vm.downloadAllowed" ' +
        '                ng-click="vm.download()">' +
        '            Download export result' +
        '        </button>' +
        '        <button class="adp-action-b-primary"' +
        '                type="button"' +
        '                ng-if="vm.datasetAllowed" ' +
        '                ng-click="vm.goToDataset()">' +
        '            View result dataset' +
        '        </button>' +
        '        <button class="adp-action-b-primary"' +
        '                type="button"' +
        '                ng-click="vm.ok()">' +
        '            OK' +
        '        </button>' +
        '    </footer>' +
        '</form>',
      bindings: {
        resolve: '<',
        close: '&',
        dismiss: '&'
      },
      controller: 'AdpExportStatusModalController',
      controllerAs: 'vm'
    });
})();
