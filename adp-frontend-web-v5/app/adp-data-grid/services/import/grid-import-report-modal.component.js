;(function () {
  "use strict";

  angular
    .module("app.adpCommon")
    .component("adpImportReportModal", {
      templateUrl: "app/adp-data-grid/services/import/grid-import-report-modal.html",
      bindings: {
        resolve: "<",
        close: "&",
        dismiss: "&"
      },
      controllerAs: "vm",
      controller: function () {
        var vm = this;
        vm.fileArray = [];

        vm.$onInit = function () {
          var errors = [];

          _.map(vm.resolve.options.errors || [], function (err, key) {
            if (key === "overall") {
              errors.unshift({item: "", message: errorToString(err)});
            } else {
              errors.push({item: "Item " + (parseInt(key) + 1), message: errorToString(err)});
            }
          });

          vm.errors = errors;
          vm.rowsCount = vm.resolve.options.rowsCount;
        };

        vm.onClose = function () {
          vm.dismiss();
        };

        function errorToString(error) {
          if (typeof error === "object") {
            return _.map(error, function (v, k) {
              return "'" + k + "': " + errorToString(v);
            })
              .join("; ");
          } else {
            return error;
          }
        }
      }
    });
})();
