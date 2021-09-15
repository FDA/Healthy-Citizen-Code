;(function () {
  'use strict';

  angular
    .module('app.adpDataGrid')
    .factory('MixedTypeTabbedView', MixedTypeTabbedView);

  /** @ngInject */
  function MixedTypeTabbedView(TreeViewWidget) {
    return function (args, complexTypeRenderer) {
      var YAML = complexTypeRenderer(args);

      var tabsEl = $('<div>');
      var treeViewWidget;
      setTimeout(function () {
        var tabsInstance = tabsEl.dxTabPanel({
          selectedIndex: 0,
          items: [{
            title: 'Tree View',
            template: function (data, index, element) {
              var wrapper = $('<div class="adp-tab-content">');
              treeViewWidget = TreeViewWidget(args.data)
                .appendTo(wrapper);

              element.append(treeViewWidget);
            },
          }, {
            title: 'YAML',
            html: tabContent(!!YAML.html ? YAML.html() : YAML),
          }, {
            title: 'JSON',
            html: tabContent(JSON.stringify(args.data, null, 4)),
          }],
          scrollingEnabled: true,
        }).dxTabPanel('instance');

        tabsEl.on('remove', function () {
          treeViewWidget.dispose();
          tabsInstance.dispose();
        })
      }, 0);

      return tabsEl;
    }

    function tabContent(contentStr) {
      return '<div class="adp-tab-content"><div>' + contentStr + '</div></div>';
    }
  }
})();
