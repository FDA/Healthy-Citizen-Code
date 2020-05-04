(function () {
  "use strict";

  angular.module('SmartAdmin.Layout')
    .directive('smartMenuItems', function (
      AdpSchemaService,
      $rootScope,
      $compile
    ) {
      return {
        restrict: 'A',
        compile: function (element, attrs) {
          var appSchema = window.adpAppStore.appModel();
          var menuItems = window.adpAppStore.menuItems();
          var groupName = attrs.smartMenuItems;
          var iconTypes = {
            'font-awesome': 'fa fa-lg fa-fw fa-'
          };
          var user = lsService.getUser();
          var ul = $('<ul />', {
            'smart-menu': ''
          }).addClass('adp-level0');

          menuItems.sort( AdpSchemaService.getSorter('order') )

          _.forEach(menuItems, function (item) {
            createMenuItem(item, ul, 1);
          });

          var $scope = $rootScope.$new();
          var linkingFunction = $compile(ul);
          var _element = linkingFunction($scope);

          element.replaceWith(_element);

          function groupFilter(item) {
            if (groupName) {
              return item.group === groupName || groupName==='*';
            } else {
              return !item.group;
            }
          }

          function createMenuItem(item, parent, level) {
            if (groupFilter(item)) {
              var $li = item.type === 'MenuSeparator'
                ? createSeparator()
                : createItem(item, parent, level);

              if (item.css) {
                $li.addClass(item.css);
              }

              parent.append($li);
            }
          }

          function createItem(item, parent, level) {
            var li = $('<li />', {'ui-sref-active-eq': 'active'});
            var a = $('<a />');
            var i = $('<i />');
            var itemBody = null;
            var unifiedParams = {appSchema: appSchema, menuLevel: level};

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

            if (_.isFunction(item.action)) {
              a.on("click", function (e) {
                item.action(Object.assign({event:e}, unifiedParams))
              });
            }

            if (item.icon) {
              i.attr('class', iconTypes[item.icon.type] + item.icon.link);
              a.append(i);
            }

            if (_.isFunction(item.render)) {
              itemBody = item.render(unifiedParams);
            }

            if (item.title) {
              a.attr("title", item.title);
              itemBody = itemBody || item.title;
            }

            if (itemBody) {
              a.append(
                $("<span class='menu-item-body'>")
                  .addClass(level === 1 ? "menu-item-parent" : "")
                  .append(itemBody)
              );
            }

            if (item.items) {
              var ul = $("<ul />")
                .addClass("adp-level" + level);
              li.append(ul);
              li.attr('data-menu-collapse', '');

              item.items.sort( AdpSchemaService.getSorter('order') )

              _.forEach(item.items, function (child) {
                createMenuItem(child, ul, level + 1);
              })
            }

            return li;
          }

          function createSeparator() {
            return $('<li class="menu-item-separator"/>');
          }
        }
      }
    });
})();
