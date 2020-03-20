;(function () {
  "use strict";

  var NO_FILE_SELECTED_ERROR = "Please select file to upload";

  angular
    .module("app.adpCommon")
    .directive("selectNgFile", function () {
      return {
        require: "ngModel",
        link: function postLink(scope, elem, attrs, ngModel) {
          elem.on("change", function (e) {
            var files = elem[0].files;
            ngModel.$setViewValue(files);
          })
        }
      }
    })
    .component("adpUploadDialogModal", {
      templateUrl: "app/adp-common/directives/adp-upload-dialog-modal/adp-upload-dialog-modal.html",
      bindings: {
        resolve: "<",
        close: "&",
        dismiss: "&"
      },
      controllerAs: "vm",
      controller: function ($element) {
        var vm = this;
        vm.fileArray = [];

        vm.$onInit = function () {
          vm.options = _.extend({
              uploadButtonText: "Upload",
              outputFormat: "text",
              autoOpenFileDialog: true,
              readFile: true,
              validate: function () {
                return ""
              },
            },
            vm.resolve.options);

          vm.error = NO_FILE_SELECTED_ERROR;
        };

        vm.$postLink = function () {
          if (vm.options.autoOpenFileDialog) {
            $("input", $element)
              .click();
          }
        };

        vm.onChange = function () {
          vm.error = validate();

          if (!vm.error) {
            uploadIfNotEmpty();
          }
        };

        vm.onUpload = function () {
          uploadIfNotEmpty();
        };

        vm.cancel = function () {
          vm.dismiss();
        };

        function uploadIfNotEmpty() {
          if (!vm.fileArray.length) {
            vm.error = NO_FILE_SELECTED_ERROR;
          } else {
            upload();
          }
        }

        function upload() {
          if (vm.options.readFile) {
            var reader = new FileReader();
            var readerMethod = "readAs" + vm.options.outputFormat.substr(0, 1)
              .toUpperCase() + vm.options.outputFormat.substr(1);

            if (reader[readerMethod]) {
              reader.onload = function (event) {
                var result = _.assign({},
                  getFileProps(vm.fileArray[0]),
                  {contents: event.target.result});

                vm.close({$value: result});
              };
              reader[readerMethod](vm.fileArray[0]);
            }
          } else {
            vm.close({$value: vm.fileArray[0]});
          }
        }

        function getFileProps(file) {
          return _.pick(file, "name", "size", "type", "lastModified");
        }

        function validate() {
          return vm.options.validate(vm.fileArray[0]);
        }
      }
    });
})();
