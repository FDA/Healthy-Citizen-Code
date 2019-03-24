;(function () {
  'use strict';

  angular
    .module('app.adpUi')
    .directive('adpBreadcrumbs', adpBreadcrumbs);

  function adpBreadcrumbs(
    $transitions,
    $state,
    AdpSessionService
  ) {
    return {
      restrict: 'EA',
      replace: true,
      templateUrl: 'app/adp-ui/directives/adp-breadcrumbs/adp-breadcrumbs.template.html',
      link: function (scope) {
        var MENU_ITEMS = window.adpAppStore.menuItems();
        var flattenMenu = flattenMenuItems(MENU_ITEMS);

        function init() {
            scope.breadcrumbs = getBreadcrumbs($state.current);
            $transitions.onStart(null, onStateChangeStart);
        }
        init();

        function onStateChangeStart(transition) {
          var toState = transition.to();
          if (!lsService.getUser()) return;

          scope.breadcrumbs = getBreadcrumbs(toState);
        }

        function flattenMenuItems(menuItems, resultItems) {
          var result = resultItems || [];

          menuItems.forEach(function (item) {
            result.push(item);

            if (item.items) {
              flattenMenuItems(item.items, result);
            }
          });

          return result;
        }

        function getState(stateName, menuItem) {
          var state = $state.get(stateName);
          var user = lsService.getUser() || {};
          var breadcrumb = {
            content: menuItem.title ? menuItem.title : menuItem,
            stateName: menuItem.stateName
          };

          if (state) {
            breadcrumb.href = $state.href(state.name, user)
          }

          return breadcrumb;
        }

        function getBreadcrumbs(state) {
          var breadcrumbs = [];
          var currentMenuItem = _.find(flattenMenu, { stateName: state.name });
          var currentState;

          while (currentMenuItem) {
            currentState = getState(currentMenuItem.stateName, currentMenuItem);
            breadcrumbs.unshift(currentState);
            currentMenuItem = currentMenuItem.parent;
          }

          return breadcrumbs;
        }
      }
    }
  }
})();