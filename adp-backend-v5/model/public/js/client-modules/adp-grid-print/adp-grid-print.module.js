(function () {
  angular.module('app.adpGridPrint', []).factory('AdpGridPrint', GridPrint);

  /** @ngInject */
  function GridPrint(
    AdpClientCommonHelper,
    GridOptionsHelpers,
    GraphqlCollectionQuery,
    AdpBrowserService,
    PrintTableBuilder,
    AdpNotificationService,
    GridSchema,
    ErrorHelpers
  ) {
    return function (toolbarWidgetRegister) {
      var schema = this.modelSchema;
      var actionOptions = this.actionOptions;

      return toolbarWidgetRegister(function (gridComponent) {
        return {
          widget: 'dxMenu',
          options: {
            dataSource: [{ template: AdpClientCommonHelper.getMenuItemTemplate(actionOptions) }],
            cssClass: 'adp-toolbar-menu grid-view-menu',
            onItemClick: function () {
              printAction(schema, GridOptionsHelpers.getLoadOptions(gridComponent));
              AdpClientCommonHelper.repaintToolbar(gridComponent);
            },
          },
        };
      });
    };

    function printAction(schema, loadOptions) {
      var schemaForRequest = GridSchema.getSchemaForVisibleColumns(schema);

      GraphqlCollectionQuery(schemaForRequest, loadOptions)
        .then(function (response) {
          if (!response.items.length) {
            return AdpNotificationService.notifyError('There is no records to print');
          }
          var html = PrintTableBuilder.build(schemaForRequest, response.items);
          print(schema, html);
        })
        .catch(function (error) {
          ErrorHelpers.handleError(error, 'Error while printing');
        });
    }

    function print(schema, html) {
      var iframe = createIframe(schema.fullName);
      window.document.body.appendChild(iframe);

      iframe.onload = function () {
        var iframeWindow = getIframeWindow(iframe);
        $(iframeWindow.document.body).html(html);

        registerAfterPrintEvent(iframe);
        printIframeContent(iframe);
      };
    }

    function createIframe(title) {
      var iframe = document.createElement('iframe');
      iframe.srcdoc = '<html><head><title>' + title + '</title>';

      var styleToHideIframe = 'visibility: hidden; height: 0; width: 0; position: absolute;';
      iframe.setAttribute('style', styleToHideIframe);
      iframe.setAttribute('name', iframeName());
      iframe.setAttribute('id', iframeName());

      return iframe;
    }

    function getIframeWindow(iframe) {
      return iframe.contentWindow || iframe.contentDocument;
    }

    function iframeName() {
      return 'print-iframe';
    }

    function printIframeContent(iframe) {
      iframe.focus();

      // If Edge or IE, try catch with execCommand
      if (AdpBrowserService.isEdge() || AdpBrowserService.isIE()) {
        try {
          iframe.contentWindow.document.execCommand('print', false, null);
        } catch (e) {
          iframe.contentWindow.print();
        }
      } else {
        iframe.contentWindow.print();
      }
    }

    function registerAfterPrintEvent(iframe) {
      var event = 'mouseover';
      if (AdpBrowserService.isChrome() || AdpBrowserService.isFirefox()) {
        event = 'focus';
      }

      var handler = function () {
        iframe.onload = null;
        iframe.remove();
        window.removeEventListener(event, handler);
      };

      window.addEventListener(event, handler);
    }
  }
})();
