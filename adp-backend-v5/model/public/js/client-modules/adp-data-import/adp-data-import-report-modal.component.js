(function () {
  'use strict';

  angular.module('app.adpDataImport').component('adpImportReportModal', {
    template:
      '<div class="modal-header import-report-modal">' +
      '    <h3 class="modal-title success-icon" ng-if="!vm.errors.length">Import successful</h3>' +
      '    <h3 class="modal-title error-icon" ng-if="vm.errors.length">Errors occurred while importing</h3>' +
      '</div>' +
      '<div class="modal-body import-report-modal">' +
      '    <div ng-if="!vm.errors.length">' +
      '        <span ng-if="vm.rowsCount>1">{{vm.rowsCount}} documents are</span>' +
      '        <span ng-if="vm.rowsCount==1">One document is</span>' +
      '        inserted successfully' +
      '    </div>' +
      '    <div ng-if="vm.errors.length">' +
      '        <div ng-repeat="error in vm.errors">' +
      '            <div><span ng-if="error.item">{{error.item}}: </span><strong>{{error.message}}</strong></div>' +
      '        </div>' +
      '    </div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '    <button class="btn btn-primary" ng-click="vm.onClose()">Close</button>' +
      '</div>',
    bindings: {
      resolve: '<',
      close: '&',
      dismiss: '&',
    },
    controllerAs: 'vm',
    controller: function () {
      var vm = this;
      vm.fileArray = [];

      vm.$onInit = function () {
        var errors = [];

        _.map(vm.resolve.options.errors || [], function (err, key) {
          if (key === 'overall') {
            errors.unshift({ item: '', message: errorToString(err) });
          } else {
            errors.push({ item: 'Item ' + (parseInt(key) + 1), message: errorToString(err) });
          }
        });

        vm.errors = errors;
        vm.rowsCount = vm.resolve.options.rowsCount;
      };

      vm.onClose = function () {
        vm.dismiss();
      };

      function errorToString(error) {
        if (typeof error === 'object') {
          return _.map(error, function (v, k) {
            return "'" + k + "': " + errorToString(v);
          }).join('; ');
        } else {
          return error;
        }
      }
    },
  });
})();
