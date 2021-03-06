;(function () {
  'use strict';

  angular
    .module('app.adpGenerator')
    .provider('AdpMenuGenerator', AdpMenuGenerator);

  /**
   * @ngdoc service
   * @memberOf app.adpGenerator
   *
   * @description
   * Angular provider for menu items generation.
   *
   *
   * @param {constant} CONSTANTS
   * @return {{createMenuItems: AdpMenuGenerator.createMenuItems, getDefaultStateParams: AdpMenuGenerator.getDefaultStateParams}}
   * @constructor
   */
  function AdpMenuGenerator(CONSTANTS) {
    var service = {
      createMenuItems: createMenuItems,
      getDefaultStateParams: getDefaultStateParams,
    };

    service.$get = function () {
      return service;
    };
    return service;

    /**
     * @memberOf AdpMenuGenerator
     * @description
     *
     * Recursively iterate the interface.main_menu.fields collection to create menuItems[].
     *
     * menuItems[] is used to create Menu UI items with smartMenuItems.js directive.
     *
     * Each menuItem has following structure:
     *  menuItem = {
     *    title: item.fullName,
     *    icon: item.icon,
     *    type: item.type,
     *    fieldName: fieldName,
     *    parent: parentMenuItem
     *  }
     *
     *  Optional properties: Depending on link format from interface.main_menu.fields[item] menuItem
     *  may contain following properties:
     *
     *  - if interface.fields[item].link starts with 'http'
     *    - href
     *    - target
     *
     *  - else
     *    - link - exact value of interface.main_menu.fields[item].link property
     *    - stateName - name of the angular ui router state, which is provided to ui-sref directive.
     *      check the _linkToState() function for more details.
     *
     * @param  {Object} menuInterface - interface.main_menu.fields
     * @param  {Object} parentMenuItem
     *
     * @return {Object[]} menuItems
     */
    function createMenuItems(menuInterface, parentMenuItem) {
      if (_.isUndefined(menuInterface.fields)) {
        throw new Error('Property fields in INTERFACE.main_menu not found.');
      }

      return _.map(menuInterface.fields, function (item, fieldName) {
        try {
          var stateName;
          var menuItem = {
            title: item.fullName,
            icon: item.icon,
            type: item.type,
            fieldName: fieldName
          };

          if (!_.isUndefined(item.link)) {
            if (_.startsWith(item.link, 'http')) {
              menuItem.href = item.link;
              menuItem.target = '_blank';
            } else {
              stateName = _linkToState(item.link);
              menuItem.link = item.link;
              // TODO: refactor to provide params from CurrentUser{} here, not from smartMenuItems.js directive
              menuItem.stateName = (item.action === 'add') ? stateName + '({addRecord: true})' : stateName;
            }
          }

          if (!_.isUndefined(parentMenuItem)) {
            menuItem.parent = parentMenuItem;
          }

          if ('fields' in item) {
            menuItem.items = createMenuItems(item, menuItem);
          }

          return menuItem;
        } catch (e) {
          console.error('Menu item creation failed with error: ', e);
          console.error('Menu item :', item);
        }
      });
    }

    /**
     * @memberOf AdpMenuGenerator
     * @description
     *
     * Convert interface.main_menu.fields[item].link to ui router state name.
     * To convert State name from menuItem link we are using convention: we are assuming that link structure
     * mirrors the structure app schema. That why last part of url is used as name of child state to keep
     * all states flat (only two levels ui router states, eg: app.child).
     *
     * Examples:
     *  /basicTypes -> app.basicTypes
     *  /test/:id/test-page -> app.testPage
     *  /lvl1/lvl2/lvl3 -> app.lvl3
     *
     * IMPORTANT: :id params as last of url is not supported at the moment.
     * @param {string} link
     * @return {string} stateName
     * @private
     */
    function _linkToState(link) {
      var newLink = 'app.' + _.last(link.split('/'));

      return _dashCaseToCamelCase(newLink);
    }

    function _dashCaseToCamelCase(string) {
      return string.replace(/-([a-z0-9])/g, function (g) {
        return g[1].toUpperCase();
      });
    }

    /**
     * @memberOf AdpMenuGenerator
     * @description
     *
     * Create default menu item from interface.default.
     *
     * If interface.default is not defined, then return first item from interface.main_menu with link property.
     *
     * IMPORTANT: :id params is not supported. If default URL is containing :params, error will be thrown.
     * @param  {{url: String, stateName: String}} menuInterface
     */
    function getDefaultStateParams(menuInterface) {
      var state, defaultMenuItem, URL_PARAMS_REGEX = /\/:([^\/\n\r]+)/g;

      if ('default' in menuInterface) {
        state = {
          url: menuInterface.default,
          stateName: _linkToState(menuInterface.default)
        };
        _logDebug('======= Default page found: \n', state);
      } else {
        defaultMenuItem = _findDefaultInMenu(menuInterface);

        state = {
          url: defaultMenuItem.link,
          stateName: _linkToState(defaultMenuItem.link)
        };
        _logDebug('======= Default page not found. Adding as default page :\n', state);
      }

      if (URL_PARAMS_REGEX.test(state.link)) {
        console.error('======= Default state link ' + defaultMenuItem.link + ' can\'t contain url params');
      }

      return state;
    }

    /**
     * @memberOf AdpMenuGenerator
     * @description
     *
     * Search for first valid menu item in interface config.
     * Assuming that valid state must have 'link' property.
     *
     * @param  {Object} menuInterface
     * @return {Object} menuInterface.fields item
     */
    function _findDefaultInMenu(menuInterface) {
      // TODO: check if state has schema
      return _.chain(menuInterface.fields)
        .flatMap(function(item) {
          return item.fields ? _.flatten(_.toArray(item.fields)) : item;
        })
        .find(function (item) {
          return 'link' in item;
        })
        .value();
    }

    function _logDebug() {
      if (CONSTANTS.debug) {
        console.log.apply(console, arguments);
      }
    }
  }
})();
