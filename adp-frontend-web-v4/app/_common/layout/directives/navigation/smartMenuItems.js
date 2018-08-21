(function () {
  "use strict";

  angular.module('SmartAdmin.Layout')
    .directive('smartMenuItems', function (
      $http,
      $rootScope,
      $compile,
      localStorageService
    ) {
      return {
        restrict: 'A',
        compile: function (element, attrs) {
          var MENU_ITEMS = window.adpAppStore.menuItems();

          var iconTypes = {
            'font-awesome': 'fa fa-lg fa-fw fa-'
          };

          var user = localStorageService.get('user');

          function createItem(item, parent, level) {
            var li = $('<li />', {'ui-sref-active-eq': 'active'});
            var a = $('<a />');
            var i = $('<i />');

            li.append(a);

            if (item.stateName) {
              a.attr('ui-sref', item.stateName + '(' + JSON.stringify(user) + ')');
            }

            if (item.href) {
              a.attr('href', item.href);
            }

            if (item.target) {
              a.attr('target', item.target);
            }

            if (item.icon) {
              i.attr('class', iconTypes[item.icon.type] + item.icon.link);
              a.append(i);
            }

            if (item.title) {
              a.attr('title', item.title);
              if (level == 1) {
                a.append('<span class="menu-item-parent">' + item.title + '</span>');
              } else {
                a.append(' ' + item.title);
              }
            }

            if (item.items) {
              var ul = $('<ul />');
              li.append(ul);
              li.attr('data-menu-collapse', '');
              _.forEach(item.items, function (child) {
                createItem(child, ul, level + 1);
              })
            }

            parent.append(li);
          }

          var ul = $('<ul />', {
            'smart-menu': ''
          });

          _.forEach(MENU_ITEMS, function (item) {
            createItem(item, ul, 1);
          });

          var $scope = $rootScope.$new();
          var html = $('<div>').append(ul).html();
          var linkingFunction = $compile(html);

          var _element = linkingFunction($scope);

          element.replaceWith(_element);
        }
      }
    });
})();
