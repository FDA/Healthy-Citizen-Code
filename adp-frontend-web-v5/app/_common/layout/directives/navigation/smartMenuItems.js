(function () {
  "use strict";

  angular.module('SmartAdmin.Layout')
    .directive('smartMenuItems', function (
      AdpSchemaService,
      AdpUnifiedArgs,
      AdpIconsHelper,
      $rootScope,
      $compile
    ) {
      return {
        restrict: 'A',
        compile: function (element, attrs) {
          var menuItems = window.adpAppStore.menuItems();
          var groupName = attrs.smartMenuItems;
          var user = lsService.getUser();
          var ul = $('<ul />', {
            'smart-menu': ''
          }).addClass('adp-level0');

          menuItems.sort( AdpSchemaService.getSorter('order') )

          _.forEach(menuItems, function (item) {
            createMenuItem(item, ul, 1, '');
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

          function createMenuItem(item, parent, level, path) {
            if (groupFilter(item)) {
              var $li = item.type === 'MenuSeparator'
                ? createSeparator()
                : createItem(item, parent, level, path);

              if (item.css) {
                $li.addClass(item.css);
              }

              parent.append($li);
            }
          }

          function createItem(item, parent, level, path) {
            var li = $('<li />', {'ui-sref-active-eq': 'active'});
            var a = $('<a />');
            var itemBody = null;
            var currentPath = path + (path ? '.' : '') + item.fieldName;
            var unifiedParams = AdpUnifiedArgs.getHelperParamsWithConfig({
              path: currentPath,
              formData: null,
              schema: item.fieldSchema,
            });

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
                item.action(Object.assign(unifiedParams, {event: e, action: "menuClick"}))
              });
            }

            if (item.icon) {
              var i = AdpIconsHelper.getIconHtml(item.icon);

              a.append(i);
            }

            if (_.isFunction(item.render)) {
              itemBody = item.render(Object.assign(unifiedParams, {action: "menuRender"}));
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
                createMenuItem(child, ul, level + 1, currentPath);
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
