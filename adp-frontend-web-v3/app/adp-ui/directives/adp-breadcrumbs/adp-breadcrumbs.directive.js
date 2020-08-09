;(function () {
  'use strict';

  angular
    .module('app.adpUi')
    .directive('adpBreadcrumbs', adpBreadcrumbs);

  function adpBreadcrumbs(
    $rootScope,
    $state,
    AdpSessionService,
    DEFAULT_STATE,
    MENU_ITEMS
  ) {
    return {
      restrict: 'EA',
      replace: true,
      templateUrl: 'app/adp-ui/directives/adp-breadcrumbs/adp-breadcrumbs.template.html',
      link: function (scope) {
        var flattenMenu = flattenMenuItems(MENU_ITEMS);

        function init() {
          scope.homeState = getHomeState(DEFAULT_STATE.stateName);
          scope.showHomeState = !isHome($state.current.name);
          scope.breadcrumbs = getBreadcrumbs($state.current);
          $rootScope.$on('$stateChangeStart', onStateChangeStart);
        }
        init();

        function onStateChangeStart(_event, toState) {
          if (!AdpSessionService.getUser()) return;
          scope.showHomeState = !isHome(toState.name);
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
          var user = AdpSessionService.getUser() || {};
          var breadcrumb = {
            content: menuItem.title ? menuItem.title : menuItem,
            stateName: menuItem.stateName
          };

          if (state) {
            breadcrumb.href = $state.href(state.name, user)
          }

          return breadcrumb;
        }

        function getHomeState(stateName) {
          var menuItem = _.find(flattenMenu, { stateName: stateName });
          return getState(stateName, menuItem);
        }

        function isHome(stateName) {
          return scope.homeState.stateName === stateName;
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