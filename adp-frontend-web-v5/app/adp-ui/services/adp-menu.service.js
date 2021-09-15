;(function () {
  'use strict';

  angular
    .module('app.adpGenerator')
    .factory('AdpMenuService', AdpMenuService);

  $.fn.smartCollapseToggle = function () {
    return this.each(function () {
      var $body = $('body');
      var $this = $(this);

      // only if not  'menu-on-top'
      if (!$body.hasClass('menu-on-top')) {
        // toggle open
        $this.toggleClass('open');
        if ($body.hasClass('mobile-view-activated')) return;

        // for minified menu collapse only second level
        if ($body.hasClass('minified')) {
          if ($this.closest('nav ul ul').length) {
            $this.find('ul:first').slideToggle(appConfig.menu_speed || 200);
          }
        } else {
          // toggle expand item
          $this.find('ul:first').slideToggle(appConfig.menu_speed || 200);
        }
      }
    });
  };

  /** @ngInject */
  function AdpMenuService(
    $rootScope,
    $sce,
    AdpUnifiedArgs,
    AdpIconsHelper,
    AdpStateGenerator,
    AdpSchemaService
  ) {
    var user = lsService.getUser();

    return {
      generateMenu: generateMenu,
      createMenu: createMenu
    };

    function generateMenu() {
      var INTERFACE = window.adpAppStore.appInterface();

      $rootScope.menu = _.cloneDeep(INTERFACE.mainMenu);
    }

    function createMenu(menuItems, parent, level, path) {
      if (!_.isObject(menuItems)) {
        return Promise.resolve([]);
      }

      var items = _.map(menuItems, function (field, key) {
        return Object.assign({fieldName: key}, field);
      });

      items.sort(AdpSchemaService.getSorter('menuOrder'))

      return Promise.all(_.map(items, function (item) {
        return _createItem(item, parent, level, path);
      }));
    }

    function _createItem(item, parent, level, path) {
      var createPromise = item.type === 'MenuSeparator'
        ? _createMenuSeparator(item, parent)
        : _createMenuItem(item, parent, level, path);

      return createPromise.then(function ($li) {
        if (item.cssClass) {
          $li.addClass(item.cssClass);
        }
      })
    }

    function _createMenuItem(item, parent, level, path) {
      var li = $('<li />', {'ui-sref-active-eq': 'active'});
      var a = item.action || item.link || item.fields ? $('<a />') : $('<span />');
      var itemBody = null;
      var itemSubmenuSchema = item.fields;
      var currentPath = path + (path ? '.' : '') + item.fieldName;
      var unifiedParams = AdpUnifiedArgs.getHelperParamsWithConfig({
        path: currentPath,
        formData: null,
        schema: item,
      });
      var menuActionFn;

      parent.append(li);
      li.append(a);

      if (item.action) {
        menuActionFn = _.get(appModelHelpers, 'MenuActions.' + item.action.link);

        if (_.isFunction(menuActionFn)) {
          a.on('click', function (e) {
            menuActionFn.call(Object.assign({}, unifiedParams, {event: e, action: 'menuClick'}))
          });
        }
      }

      if (!_.isUndefined(item.render)) {
        menuActionFn = _.get(appModelHelpers, 'MenuRenderers.' + item.render.link);

        if (_.isFunction(menuActionFn)) {
          if (item.render.renderTarget === 'submenu') {
            itemSubmenuSchema = menuActionFn.call(Object.assign({}, unifiedParams, {action: 'submenuRender'}));
          } else {
            itemBody = menuActionFn.call(Object.assign({}, unifiedParams, {action: 'menuRender'}));
          }
        }
      }

      if (item.link) {
        if (_isState(item)) {
          var stateName = AdpStateGenerator.linkToState(item.link);
          a.attr('ui-sref', stateName + '(' + JSON.stringify(item.linkParams || user) + ')');
        } else {
          a.attr('href', item.link);
          a.attr('target', item.target || '_self');
        }
      }

      if (item.fullName) {
        a.attr('title', item.fullName);
        itemBody = itemBody || item.fullName;
      }

      if (item.icon) {
        var i = AdpIconsHelper.getIconHtml(item.icon);

        a.append(i);
      }

      if (itemBody) {
        a.append(
          $('<span class="menu-item-body">')
            .addClass(level === 0 ? 'menu-item-parent' : '')
            .append(itemBody)
        );
      }

      if (itemSubmenuSchema) {
        var submenuCreatorPromise;

        if (_.isFunction(itemSubmenuSchema.then)) {
          submenuCreatorPromise = itemSubmenuSchema.then(
            function (menuSchema) {
              return _createSubmenuItems(li, a, menuSchema, level, currentPath);
            }).catch(function (err) {
            console.error('Menu subset generation is failed', err);
            submenuCreatorPromise = Promise.resolve();
          })
        } else {
          submenuCreatorPromise = _createSubmenuItems(li, a, itemSubmenuSchema, level, currentPath);
        }

        return submenuCreatorPromise.then(function () {
          return Promise.resolve(li);
        });
      }

      return Promise.resolve(li);
    }

    function _createSubmenuItems(li, a, items, level, currentPath) {
      if (!_.keys(items).length) {
        return Promise.resolve();
      }

      var ul = $('<ul />').addClass('adp-level' + (level + 1));

      li.append(ul)
        .on('click', '>a', function (e) {
          li.siblings('.open').smartCollapseToggle();
          li.smartCollapseToggle();

          if (!li.hasClass('open') && li.find('li.active').length > 0) {
            li.addClass('active')
          }

          e.preventDefault();
        })
      a.append('<b class="collapse-sign"><em class="fa collapse-icon"></em></b>');

      return createMenu(items, ul, level + 1, currentPath);
    }

    function _createMenuSeparator(item, parent) {
      return Promise.resolve($('<li class="menu-item-separator"/>').appendTo(parent));
    }

    function _isState(menuItem) {
      return !_.get(menuItem, 'external', false);
    }
  }
})();
