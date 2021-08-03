'use strict';

angular.module('SmartAdmin.Layout')
  .directive('demoControls', function ($rootScope, AdpModalService) {
    return {
      restrict: 'EA',
      replace: true,
      templateUrl: 'app/_common/layout/directives/demo-controls/demo-controls.template.html',
      scope: true,
      link: function (scope, element) {
        element.parent().css({
          position: 'relative'
        });

        element.on('click', '#demo-setting', function () {
          element.toggleClass('activate')
        })
      },
      controller: function ($scope, AdpLayoutConfigService) {
        var $root = $('body');

        $scope.$watch('fixedRibbon', function (fixedRibbon) {
          $root.toggleClass('fixed-ribbon', fixedRibbon);
          if (fixedRibbon) {
            $scope.container = false;
          }
        });

        $scope.$watch('fixedFooter', function (fixedPageFooter) {
          $root.toggleClass('fixed-page-footer', fixedPageFooter);
        });

        $scope.$watch('rtlSupport', function (rtl) {
          $root.toggleClass('smart-rtl', rtl);
        });

        $scope.$watch('menuOnTop', function (menuOnTop) {
          $rootScope.$broadcast('$smartLayoutMenuOnTop', menuOnTop);
          $root.toggleClass('menu-on-top', menuOnTop);

          if (menuOnTop)$root.removeClass('minified');
        });

        $scope.$watch('colorblindFriendly', function (colorblindFriendly) {
          $root.toggleClass('colorblind-friendly', colorblindFriendly);
        });

        var layoutConfig = AdpLayoutConfigService.get();
        $scope.fixedRibbon = layoutConfig['fixed-ribbon'];
        $scope.fixedFooter = layoutConfig['fixed-footer'];
        $scope.rtlSupport = layoutConfig['smart-rtl'];
        $scope.colorblindFriendly = layoutConfig['colorblind-friendly'];
        $scope.menuOnTop = layoutConfig['menu-on-top'];

        $scope.smartSkin = AdpLayoutConfigService.getSkin();
        $scope.skins = appConfig.skins;

        $scope.setSkin = function (skin) {
          $scope.smartSkin = skin.name;
          $root.removeClass(_.map($scope.skins, 'name').join(' '));
          $root.addClass(skin.name);
          // $("#logo img").attr('src', skin.logo);
        };

        if ($scope.smartSkin !== "smart-style-0") {
          $scope.setSkin(_.find($scope.skins, {name: $scope.smartSkin}))
        }

        $scope.factoryReset = function () {
          var options = { message: 'Would you like to RESET all your widgets?' };

          AdpModalService.confirm(options)
            .then(function () {
              location.reload();
            });
        }
      }
    }
  });
