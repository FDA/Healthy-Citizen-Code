;(function () {
  'use strict';

  angular
    .module('app.hcGenerator')
    .provider('HcRoutingGenerator', HcRoutingGenerator);

  /** @ngInject */
  function HcRoutingGenerator() {
    var service = {
      createMenuItems: createMenuItems,
      getDefaultStateParams: getDefaultStateParams,
    };

    service.$get = function () {
      return service;
    };
    return service;

    //==================== METHODS
    /**
     * createMenuItems - create menuConfiguration from app model
     *
     * @param  {Object} menuInterface
     * @param  {Object} parent
     */
    function createMenuItems(menuInterface, parent) {
      return _.map(menuInterface.fields, function (item, fieldName) {
        var menuItem = {
          title: item.fullName,
          icon: item.icon,
          type: item.type,
          fieldName: fieldName
        };

        if (!_.isUndefined(item.link)) {
          if (!_.startsWith(item.link, 'http')) {
            var stateName = _linkToState(item.link);
            stateName = _dashCaseToCamelCase(stateName);
            menuItem.link = item.link;
            menuItem.stateName = (item.action === 'add') ? stateName + '({addRecord: true})' : stateName;
          } else {
            menuItem.href = item.link;
            menuItem.target = '_blank';
          }
        }

        if (!_.isUndefined(parent)) {
          menuItem.parent = parent;
        }

        if ('fields' in item) {
          menuItem.items = createMenuItems(item, menuItem);
        }

        return menuItem;
      });
    }

    function _linkToState(link) {
      return 'app.' +_.last(link.split('/'));
    }

    function _dashCaseToCamelCase(string) {
      return string.replace(/-([a-z])/g, function (g) {
        return g[1].toUpperCase();
      });
    }

    /**
     * Find default menu item, if not found return first
     *
     * @param  {Object} menuInterface
     */
    function getDefaultStateParams(menuInterface) {
      var state, defaultMenuItem;

      if ('default' in menuInterface) {
        state = {
          url: menuInterface.default,
          stateName: _linkToState(menuInterface.default)
        };
      } else {
        defaultMenuItem = _findDefaultInMenu(menuInterface);

        state = {
          url: defaultMenuItem.link,
          stateName: _linkToState(defaultMenuItem.link)
        };
      }

      return state;
    }

    /**
     * Search for first valid state in interface config.
     * Assuming that first valid state must have an 'link' property
     * TODO: check if state has schema
     *
     * @param  {Object} menuInterface
     */
    function _findDefaultInMenu(menuInterface) {
      return _.chain(menuInterface.fields)
        .flatMap(function(item) {
          return item.fields ? _.flatten(_.toArray(item.fields)) : item;
        })
        .find(function (item) {
          return 'link' in item;
        })
        .value();
    }
  }
})();
