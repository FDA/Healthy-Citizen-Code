;(function() {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .directive('adpClipboardButton', function ($timeout) {
      return {
        restrict: 'E',
        templateUrl: 'app/adp-data-grid/components/adp-record-details/adp-clipboard-button/adp-clipboard-button.template.html',
        scope: {
          args: '='
        },
        link: function (scope, element) {
          $timeout(function init() {
            initClipboardBtn();

            scope.tooltipOptions = {
              target: element.find('button'),
              position: 'top',
            };
          });

          function initClipboardBtn() {
            var fieldName = scope.args.fieldSchema.fieldName;
            var schemaName = scope.args.modelSchema.schemaName;
            var copyTarget = '.' + schemaName + ' .name-' + fieldName + ' div';

            var getCopyTargetEl = function () {
              return window.document.querySelector(copyTarget);
            };

            var clipboardBtn = new window.ClipboardJS(
              element[0].querySelector('button'),
              {
                target: getCopyTargetEl,
                text: function () {
                  if (scope.args.fieldSchema.type === 'Html') {
                    return scope.args.data;
                  }

                  var targetEl = function () {
                    return window.document.querySelector(copyTarget);
                  };

                  return targetEl().innerText;
                }
              }
            );

            clipboardBtn.on('success', onSuccessCopy);

            scope.$on('$destroy', function () {
              clipboardBtn.destroy();
            });
          }

          function onSuccessCopy(e) {
            var tooltipEl = $(e.trigger).siblings('[dx-tooltip]');
            tooltipEl.dxTooltip('show')
              .then(function () {
                tooltipEl.dxTooltip('hide');
              });
          }
        }
      }
    });

})();
