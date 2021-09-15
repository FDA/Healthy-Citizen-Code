;(function () {
  'use strict';

  angular
    .module('app')
    .directive('adpMainMenu', adpMainMenu);

  function adpMainMenu(
    AdpSchemaService,
    AdpUnifiedArgs,
    AdpMenuService,
    AdpIconsHelper,
    $rootScope,
    $sce,
    $compile
  ) {
    return {
      restrict: 'A',
      replace: true,
      scope: {
        adpMainMenu: '=',
      },
      link: function (scope, element) {
        var currentMenuElement = element;

        $rootScope.$watch('menu', renderMenu);
        $rootScope.$watch('avatar.id', function (newVal, oldVal) {
          if (newVal === oldVal) {
            return;
          }

          renderMenu();
        });

        function renderMenu() {
          var menuItems = scope.adpMainMenu;
          var $ul = $('<ul />').addClass('adp-level0');

          AdpMenuService.createMenu(menuItems.fields, $ul, 0, '').then(
            function(){
              var $scope = $rootScope.$new();
              var linkingFunction = $compile($ul);
              var _element = linkingFunction($scope);

              currentMenuElement.replaceWith(_element);
              currentMenuElement = _element;
            }
          );
        }
      }
    }
  }
})();
