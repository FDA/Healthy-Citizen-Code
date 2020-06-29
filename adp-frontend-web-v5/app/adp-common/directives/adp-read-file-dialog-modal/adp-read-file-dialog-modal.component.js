;(function () {
  "use strict";

  var NO_FILE_SELECTED_ERROR = "Please select file to readFile";

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
    .component("adpReadFileDialogModal", {
      templateUrl: "app/adp-common/directives/adp-read-file-dialog-modal/adp-read-file-dialog-modal.html",
      bindings: {
        resolve: "<",
        close: "&",
        dismiss: "&"
      },
      controllerAs: "vm",
      controller: function (
        $element,
        AdpFileDropzoneHelper
      ) {
        var vm = this;
        vm.fileArray = [];
        vm.selectedFilesText = "";

        vm.$onInit = function () {
          vm.options = _.extend(
            {
              uploadButtonText: "Upload",
              outputFormat: "text",
              autoOpenFileDialog: false,
              readFile: true,
              validate: function () {
                return ""
              },
            },
            vm.resolve.options);

          vm.error = NO_FILE_SELECTED_ERROR;
        };

        vm.$postLink = function () {
          initDropZone();

          if (vm.options.autoOpenFileDialog) {
            vm.onInput();
          }
        };

        vm.onInput = function () {
          $("input", $element).click();
        };

        vm.onChange = function () {
          vm.error = validate();
          vm.selectedFilesText = vm.error ? "" : _.map(vm.fileArray, function (file) {
            return file.name
          }).join(", ");
        };

        vm.onReadFile = function () {
          readIfNotEmpty();
        };

        vm.cancel = function () {
          destroyDropZone()
          vm.dismiss();
        };

        function readIfNotEmpty() {
          if (!vm.fileArray.length) {
            vm.error = NO_FILE_SELECTED_ERROR;
          } else {
            readFile();
          }
        }

        function readFile() {
          if (vm.options.readFile) {
            var reader = new FileReader();
            var readerMethod = "readAs" + vm.options.outputFormat.substr(0, 1)
                                            .toUpperCase() + vm.options.outputFormat.substr(1);

            if (reader[readerMethod]) {
              reader.onload = function (event) {
                var result = _.assign(
                  {},
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

        function initDropZone() {
          var $dropZone = $(".drop-zone", $element);

          AdpFileDropzoneHelper.bindEvents($dropZone, {
            onDrop: function (e) {
              vm.fileArray = [e.originalEvent.dataTransfer.files[0]];
              vm.onChange();
            }
          })
        }

        function destroyDropZone() {
          var $dropZone = $(".drop-zone", $element);

          AdpFileDropzoneHelper.getUnbindEvents($dropZone)();
        }
      }
    });
})();
