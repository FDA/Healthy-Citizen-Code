;(function() {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .directive('adpClipboardButton', function ($timeout) {
      return {
        restrict: 'E',
        templateUrl: 'app/adp-ui/directives/adp-clipboard-button/adp-clipboard-button.template.html',
        scope: {
          args: '='
        },
        link: function (scope, element) {
          var tooltipCmp;
          scope.showClipboardBtn = function (args) {
            return ['Code', 'Html', 'Mixed', 'Text'].includes(args.fieldSchema.type);
          };

          if (!scope.showClipboardBtn(scope.args)) {
            return;
          }

          $timeout(function init() {
            scope.menuOptions = {
              cssClass: 'adp-clipboard-btn',
              dataSource: getDataSource(scope.args.fieldSchema.type),
              onItemClick: function(e) {
                var data = e.itemData;

                if (!data.clickable) {
                  return;
                }

                copyToClipboard(data)
                  .then(showTooltip)
                  .catch(function (err) {
                    console.error('Error while writing to clipboard: ', err);
                  });
              },
            };

            scope.tooltipOptions = {
              target: element.find('[dx-menu]'),
              position: 'top',
              onInitialized: function (e) {
                tooltipCmp = e.component;
              }
            };
          });

          function copyToClipboard(data) {
            var itemContents = {};
            var dataToCopy = getClipboardData(data.stripHtml);
            itemContents[data.mime] = new Blob([dataToCopy], { type: data.mime });

            var ClipboardAPI = window.clipboard;
            var copyItem = new ClipboardAPI.ClipboardItem(itemContents);

            return ClipboardAPI.write([copyItem]);
          }

          function getClipboardData(stripHtml) {
            var result = _.get(scope, 'args.data');
            if (!result) {
              return '';
            }

            if (_.get(scope, 'args.fieldSchema.type') === 'Mixed') {
              return getMixedTypeData(result);
            }

            if (stripHtml) {
              return stripHtmlString(result);
            }

            return result;
          }

          function getMixedTypeData(rawData) {
            var isJsonSelected = isJsonTabSelected();

            if (_.isObject(rawData)) {
              return isJsonSelected ?
                JSON.stringify(rawData, null, 2) :
                window.jsyaml.safeDump(rawData);
            }

            return rawData;
          }

          function isJsonTabSelected() {
            // hardcoded, binded to viewDetails only, anyway it returns false any other action
            var selector = [
              '.' + scope.args.modelSchema.schemaName,
              '.name-' + scope.args.fieldSchema.fieldName,
              '.dx-tab-selected .dx-tab-text',
            ].join(' ');

            return $(document).find(selector).text() === 'JSON';
          }

          function showTooltip() {
            tooltipCmp.show()
              .then(function () {
                tooltipCmp.hide();
              });
          }

          function stripHtmlString(data) {
            var el = '<div>' + data.trim() + '</div>';
            return $(el).text();
          }

          function getDataSource(type) {
            if (type === 'Html') {
              return [{
                icon: 'fa fa-clipboard',
                items: [{
                  text: 'Copy HTML Markup',
                  mime: 'text/plain',
                  clickable: true,
                }, {
                  text: 'Copy as Plain Text',
                  stripHtml: true,
                  mime: 'text/plain',
                  clickable: true,
                }, {
                  text: 'Copy as Rich Text',
                  mime: 'text/html',
                  clickable: true,
                }]
              }]
            }

            return [{
              icon: 'fa fa-clipboard',
              clickable: true,
              mime: 'text/plain',
            }];
          }
        }
      }
    });

})();
