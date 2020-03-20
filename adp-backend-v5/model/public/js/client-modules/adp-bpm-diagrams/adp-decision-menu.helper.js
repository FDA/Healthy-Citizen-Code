(function() {
  angular.module('app.adpBpmDiagrams').factory('AdpDecisionMenuHelper', AdpDecisionMenuHelperFactory);

  /** @ngInject */
  function AdpDecisionMenuHelperFactory($timeout) {
    return function(node, diagramInstance, selectedId) {
      var menu = { selection: null, component: null };

      node.dxMenu({
        dataSource: [],
        cssClass: 'adp-bpm-menu',
        onInitialized: onDecisionMenuInit,
      });

      return menu;

      function onDecisionMenuInit(e) {
        menu.component = e.component;
        menu.selected = { id: selectedId };

        menu.doRefresh = getDecisionMenuRefresh(menu);

        e.component.option('onItemClick', getOnDecisionMenuClick(menu));

        $timeout(menu.doRefresh, 0); // $timeout is essential due internal dx behaviour
      }

      function getOnDecisionMenuClick(menu) {
        return function(e) {
          if (e.itemData.role === 'root') {
            // The idea is to update menu list "on demand" - on menu open event.
            // The problem is: menu closes if get updated
            // The solution is to cancel mouse-click event, refresh menu list, and manually open menu after - "almost" instantly.
            if (e.event && e.event.originalEvent) {
              // check is this a mouse-generated event
              e.cancel = true;

              menu.doRefresh();

              $(e.element)
                .find('.dx-menu-item')
                .eq(0)
                .trigger('dxclick');
            }
          } else {
            menu.selected = e.itemData;
            menu.component._options.dataSource[0].text = getDecisionMenuRootText(e.itemData);
            menu.component.repaint();
          }
        };
      }

      function getDecisionMenuRefresh(menu) {
        return function() {
          var items = getDecisionMenuItems();
          var selected = getDecisionSelectedItem(items, menu.selected);

          if (!selected && items.length === 1) {
            selected = items[0];
          }

          var rootText = getDecisionMenuRootText(selected, items);

          menu.selected = selected;
          menu.component.option('dataSource', [
            {
              text: rootText,
              items: items,
              icon: 'spindown',
              role: 'root',
            },
          ]);
        };
      }

      function getDecisionMenuItems() {
        return _.map(
          _.filter(diagramInstance._definitions.drgElements, function(elem) {
            return elem.$type === 'dmn:Decision';
          }),
          function(item) {
            return { text: item.name || '<untitled>', id: item.id, role: 'node' };
          }
        );
      }

      function getDecisionSelectedItem(items, selected) {
        if (!selected) {
          return null;
        }

        return findById(items, selected.id);
      }

      function findById(items, id) {
        return _.find(items, function(item) {
          return id === item.id;
        });
      }

      function getDecisionMenuRootText(selected, items) {
        if (selected) {
          return 'Run: ' + selected.text;
        } else {
          if (items.length) {
            return 'Select run decision';
          } else {
            return 'At least one decision block required';
          }
        }
      }
    };
  }
})();
