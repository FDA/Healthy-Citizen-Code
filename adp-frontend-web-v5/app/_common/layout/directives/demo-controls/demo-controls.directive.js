'use strict';

angular.module('SmartAdmin.Layout')
  .directive('demoControls', function ($rootScope) {
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

        $scope.$watch('fixedHeader', function (fixedHeader) {
          $root.toggleClass('fixed-header', fixedHeader);
          if (fixedHeader == false) {
            $scope.fixedRibbon = false;
            $scope.fixedNavigation = false;
          }
        });


        $scope.$watch('fixedNavigation', function (fixedNavigation) {
          $root.toggleClass('fixed-navigation', fixedNavigation);
          if (fixedNavigation) {
            $scope.container = false;
            $scope.fixedHeader = true;
          } else {
            $scope.fixedRibbon = false;
          }
        });


        $scope.$watch('fixedRibbon', function (fixedRibbon) {
          $root.toggleClass('fixed-ribbon', fixedRibbon);
          if (fixedRibbon) {
            $scope.fixedHeader = true;
            $scope.fixedNavigation = true;
            $scope.container = false;
          }
        });

        $scope.$watch('fixedFooter', function (fixedPageFooter) {
          $root.toggleClass('fixed-page-footer', fixedPageFooter);
        });

        $scope.$watch('container', function (container) {
          $root.toggleClass('container', container);
          if (container) {
            $scope.fixedRibbon = false;
            $scope.fixedNavigation = false;
          }
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
        $scope.fixedHeader = layoutConfig['fixed-header'];
        $scope.fixedNavigation = layoutConfig['fixed-navigation'];
        $scope.fixedRibbon = layoutConfig['fixed-ribbon'];
        $scope.fixedFooter = layoutConfig['fixed-footer'];
        $scope.rtlSupport = layoutConfig['smart-rtl'];
        $scope.colorblindFriendly = layoutConfig['colorblind-friendly'];
        $scope.menuOnTop = layoutConfig['menu-on-top'];
        $scope.container = layoutConfig['container'];

        $scope.smartSkin = AdpLayoutConfigService.getSkin();
        $scope.skins = appConfig.skins;

        $scope.setSkin = function (skin) {
          $scope.smartSkin = skin.name;
          $root.removeClass(_.map($scope.skins, 'name').join(' '));
          $root.addClass(skin.name);
          // $("#logo img").attr('src', skin.logo);
        };

        if ($scope.smartSkin != "smart-style-0") {
          $scope.setSkin(_.find($scope.skins, {name: $scope.smartSkin}))
        }

        $scope.factoryReset = function () {
          $.SmartMessageBox({
            title: "<i class='fa fa-refresh' style='color:green'></i> Clear Settings",
            content: "Would you like to RESET all your widgets?",
            buttons: '[No][Yes]'
          }, function (ButtonPressed) {
            if (ButtonPressed == "Yes") {
              location.reload()
            }
          });
        }
      }
    }
  });