;(function() {
  'use strict';

  angular
    .module('app.adpGenerator')
    .provider('AdpStateGenerator', AdpStateGenerator);

  var contents = {
    'dashboard': {
      controller: 'DashboardController as vm',
      templateUrl: 'app/adp-generator/views/dashboard.html'
    },
    'singleRecord': {
      controller: 'SingleRecordController as vm',
      templateUrl: 'app/adp-generator/views/single-record.html'
    },
    'multiRecord': {
      controller: 'MultiRecordController as vm',
      templateUrl: 'app/adp-generator/views/multi-record.html'
    },
    'customPage': function (pageParams) {
      var customPageParams = {
        template: pageParams.template
      };

      if (pageParams.controller) {
        customPageParams.controller = pageParams.controller + ' as vm';
      }

      return customPageParams;
    },
  };

  var stateDefault = {
    url: '',
    views: {
      content: {}
    },
    data: {}
  };

  /**
   * @ngdoc service
   * @memberOf app.adpGenerator
   * @description
   * Angular provider for registering ui router states from app models.
   *
   * @param {service} $stateProvider
   * @return {{createStates: AdpStateGenerator.createStates, createDashboards: AdpStateGenerator.createDashboards, createCustomPages: AdpStateGenerator.createCustomPages, _replaceUrlParams: _replaceUrlParams, $get: service.$get}}
   * @constructor
   */
  function AdpStateGenerator($stateProvider) {
    var $stateRegistry = $stateProvider.stateRegistry;

    var service = {
      createStates: createStates,
      createDashboards: createDashboards,
      createCustomPages: createCustomPages,
      createBuiltInStates: createBuiltInStates,
      _replaceUrlParams: _replaceUrlParams,
      findDashboard: findDashboard,
      getCurrentUser: getCurrentUser,
      $get: function() {
        return service;
      }
    };

    //============== METHODS
    /**
     * @memberOf AdpStateGenerator
     *
     * @description
     * Iterate application models collection to register standard ui router states.
     *
     * States are created only for models items, which has True value for item.visible and item.type 'Schema'
     * or 'Subschema'. Other models are ignored.
     *
     * State names are generated as string 'app.' + key of model to keep ui state flat.
     *
     * Example: if model has following structure model: { childModel: {} }, than stateName for model.childModel
     * will be "app.childModel".
     *
     * @param {Object} schema
     * @param {Object} interfaceConfig
     * @param {String} parentStateName - path to parent state to search
     */
    function createStates(schema, interfaceConfig, parentStateName) {
      _.each(schema, function (item, key) {
        try {
          var state, parent;
          item.schemaName = key;

          if (!_isState(item)) return;
          if (_isCustomState(key, parentStateName, interfaceConfig)) {
            return;
          }

          state = _createState(item, key, parentStateName);

          if (_isParent(item)) {
            parent = parentStateName ? parentStateName + '.' + key : key;

            createStates(item.fields, interfaceConfig, parent);
          }

          $stateRegistry.register(state);
        } catch (e) {
          console.error('State creation failed with error: ', e);
          console.error('For schema definition :', item);
        }
      });
    }

    /**
     * @memberOf AdpStateGenerator
     *
     * @description
     * Create state definition for non-custom ui router states.
     *
     * State definition:
     * - stateDefinition.url - created as conversion of schema path to url.
     *  Example: schema path phis.encounters.diagnoses is converted to phis/encounters/diagnoses
     *
     * - stateDefinition.name - created from schema key
     *  Example: if creating state for "childModel" in model: { childModel: {} } name is "childModel"
     *
     * - stateDefinition.views - content, which provided to ui router. Check description of _getPageContent()
     *  for more details.
     *
     * - stateDefinition.data  - data, which provided with every ui router state. Check description of _getPageData()
     *  for more details.
     *
     * @param {Object} schemaItem
     * @param {String} schemaName
     * @param {String} parentSchemaPath
     * @return {Object} schemaDefinition
     * @private
     */
    function  _createState(schemaItem, schemaName, parentSchemaPath) {
      try {
        var state = _.clone(stateDefault);
        var schemaPath = _getSchemaPath(schemaName, parentSchemaPath);

        state.data = _getPageData(schemaItem, schemaName, schemaPath);
        state.name = 'app.' + schemaName;
        state.views = _getPageContent(schemaPath);

        state.params = {
          action: {value: null, dynamic: true},
          _id: {value: null, dynamic: true},
          filter: {value: null, dynamic: true},
          customOpt: {value: null, dynamic: true}
        };
        state.url = _getStateUrl(schemaPath) + '?action&_id&filter&customOpt';

        return state;
      } catch (e) {
        console.error('Page state creation failed with error: ', e);
        console.error('Page state definition:', state);
        console.error('App model schema:', schemaPath);
      }
    }

    /**
     * @memberOf AdpStateGenerator
     *
     * @description
     * Iterate menuItems[] to search DashboardPage config and create dashboard state.
     *
     * @param {Object[]} menuItems
     */
    function createDashboards(menuItems) {
      var dashboards = findDashboard(menuItems);
      if (!dashboards.length) return;

      dashboards.forEach(function (dashboard) {
        _createDashboardState(dashboard);
      });
    }

    /**
     * @memberOf AdpStateGenerator
     *
     * @description
     * Find DashboardPage in menuItems[] config
     *
     * @param {Object[]} menuItems
     *
     * @return {Object} menuItem
     */
    function findDashboard(menuItems) {
      return _.filter(menuItems, function (item) {
        return item.type === 'MenuDashboardLink'
      });
    }

    /**
     * @memberOf AdpStateGenerator
     *
     * @description
     * Register dashboard ui router state.
     *
     * @param {Object} dashboardMenuItem
     * @private
     */
    function _createDashboardState(dashboardMenuItem) {
      try {
        var state = _.clone(stateDefault);

        state.name = dashboardMenuItem.stateName;
        state.url = '/' + dashboardMenuItem.link;
        state.data = {
          redirectStrategy: 'user',
          title: dashboardMenuItem.title,
          // intentional duplication of title to avoid compabillity issues in already implemented applications
          pageParams: {
            title: dashboardMenuItem.title,
            dashboardName: dashboardMenuItem.link
          }
        };

        state.views = {
          content: contents['dashboard']
        };

        $stateRegistry.register(state);
      } catch(e) {
        console.error('Dashboard state creation failed with error: ', e);
        console.error('Dashboard state definition:', state);
      }
    }

    /**
     * @memberOf AdpStateGenerator
     *
     * @description
     * Iterate application interface.pages to register custom ui router states for custom pages.
     *
     * @param {Object} interfaceConfig
     */
    function createCustomPages(interfaceConfig) {
      _.each(interfaceConfig.pages, _createCustomPageState);
    }

    /**
     * @memberOf AdpStateGenerator
     *
     * @description
     * Register ui router state for custom page.
     *
     * State name is created as concatenation of 'app.' string and name param of page.
     *
     * State definition:
     * - stateDefinition.url - page link with params, which are added from CurrentUser object.
     *
     * - stateDefinition.views - content, which provided to ui router.
     *
     * - stateDefinition.data  - data, which provided with custom page. pageConfig params are copied here.
     *
     * @param {Object} pageConfig - value from interfaceConfig.pages
     * @param {String} name - key from interfaceConfig.pages
     * @private
     */
    function _createCustomPageState(pageConfig, name) {
      try {
        var state = _.cloneDeep(stateDefault);

        state.name = 'app.' + name;
        state.url = _addRulesToUrlParams(pageConfig.link);

        state.data = _.extend({
          title: pageConfig.fullName,
          // intentional duplication of title to avoid compabillity issues in already implemented applications
          pageParams: {
            title: pageConfig.fullName
          }
        }, pageConfig);

        state.views = {
          content: contents.customPage(pageConfig)
        };

        $stateRegistry.register(state);
      } catch(e) {
        console.error('Custom page state creation failed with error: ', e);
        console.error('Custom page state definition:', state);
      }
    }

    /**
     * @memberOf AdpStateGenerator
     *
     * @description
     * Return true, if state is custom page.
     * @param {String} schemaName
     * @param {String} parentName
     * @param {Object} interfaceConfig
     * @return {boolean}
     * @private
     */
    function _isCustomState(schemaName, parentName, interfaceConfig) {
      var schemaPath = _getSchemaPath(schemaName, parentName);
      var stateUrl = _getStateUrl(schemaPath);

      return !!_.find(interfaceConfig.pages, function (page) {
        return page.link === stateUrl;
      });
    }

    /**
     * @memberOf AdpStateGenerator
     *
     * @description
     * Covert link params to link with params with regex. Regex is matching mongo _id.
     * We need this for ui router url matching.
     *
     * @param {String} link
     * @return {String}
     * @private
     */
    function _addRulesToUrlParams(link) {
      var linkToFormat = link;
      // regex for mongo _id - 24 chars length hex number
      var hexNumberRegex = "[0-9A-Fa-f]{24}";

      return linkToFormat.replace(/\/:([a-zA-Z]+)\//g, function (_, idName) {
        return ['/{', idName, ':',  hexNumberRegex,'}/', ].join('');
      });
    }

    /**
     * @memberOf AdpStateGenerator
     * @description
     * Replace url params with exact values from CurrentUser object.
     * @param {string} link
     * @return {string}
     * @private
     */
    function _replaceUrlParams(link) {
      var user = getCurrentUser();

      var linkToFormat = link.toLowerCase();

      return linkToFormat.replace(/\/:([a-zA-Z]+)\//g, function (_, idName) {
        return ['/', user[idName], '/'].join('');
      });
    }

    function getCurrentUser() {
      var userString = localStorage.getItem('user');

      try {
        return JSON.parse(userString);
      } catch (e) {}
    }

    /**
     * @memberOf AdpStateGenerator
     *
     * @description
     * Convert schemaPath to state url.
     * Example: schema path phis.encounters.diagnoses is converted to phis/encounters/diagnoses
     *
     * @param schemaPath
     * @return {string} stateUrl
     * @private
     */
    function _getStateUrl(schemaPath) {
      return '/' + schemaPath.replace(/\./g, '/');
    }

    function _getSchemaPath(schemaName, parentSchemaPath) {
      var schemaPath = schemaName;

      if (parentSchemaPath) {
        schemaPath = parentSchemaPath + '.' + schemaPath;
      }

      return schemaPath;
    }

    /**
     * @memberOf AdpStateGenerator
     *
     * @description
     * Get page data, which is provided to every ui router state.
     *
     * - pageData.title - schemaItem.fullName
     * - pageData.redirectStrategy - defines permissions to access page
     * - pageData.pageParams - Check description of _getPageData() for more details.
     *
     * @param {Object} schemaItem
     * @param {String} schemaName
     * @param {String} schemaPath
     *
     * @return {{title: string, pageParams: Object, redirectStrategy: string}} pageData
     * @private
     */
    function _getPageData(schemaItem, schemaName, schemaPath) {
      return {
        title: schemaItem.fullName,
        schemaPath: schemaPath,
        // deprecated for usage outside of provide phase
        pageParams: _getPageParams(schemaItem, schemaName, schemaPath),
        // atm: assuming that all states are restricted only to authorized users
        // TODO: change later
        redirectStrategy: 'user'
      };
    }

    /**
     * @memberOf AdpStateGenerator
     *
     * @description
     * * Get pageParams, which is provided to every ui router state with pageData.
     *
     * - pageParams.title - schemaItem.fullName
     * - pageParams.fieldName - schemaName. TODO: not correct name of property, rename
     * - pageParams.schemaPath - schemaPath. Searchable with _.get
     * - pageParams.link - state url
     * - pageParams.parentStateName
     *
     * @param {Object} schemaItem
     * @param {String} schemaName
     * @param {String} schemaPath
     *
     * @return {{title: *, fieldName: *, schemaPath: *, link: string}}
     * @private
     */
    function _getPageParams(schemaItem, schemaName, schemaPath) {
      var pageParams = {
        title: schemaItem.fullName,
        fieldName: schemaName,
        schemaPath: schemaPath.split('.').join('.fields.'),
        link: _getStateUrl(schemaPath),
      };

      if (_isChild(schemaPath)) {
        pageParams.parentStateName = _getParentState(schemaPath);
      }

      return pageParams;
    }

    /**
     * @memberOf AdpStateGenerator
     *
     * @description
     * Get content for ui router state.views property. Defines what type of page would be rendered for standard
     * ui router state.
     *
     * Possible content types for standard pages:
     * - singleRecord if schema has singleRecord property;
     * - multiRecord if schema has no singleRecord property;
     * - multiRecordNested if schema has no singleRecord property and 2+ levels deep in app models;
     *
     * @param {string} schemaPath
     * @return {{content: *}}
     * @private
     */
    function _getPageContent(schemaPath) {
      var schema = _getSchema(schemaPath);
      var pageType;

      if (schema.singleRecord) {
        pageType = 'singleRecord';
      } else {
        pageType = _isNestedState(schemaPath) ? 'multiRecordNested' : 'multiRecord';
      }

      return {
        content: contents[pageType]
      }
    }

    function _getSchema(path) {
      var schemaPath = path.split('.').join('.fields.');
      var APP_MODEL = window.adpAppStore.appModel();

      return _.get(APP_MODEL, schemaPath);
    }

    function _getParentState(schemaPath) {
      var parentName = schemaPath.split('.');

      return 'app.' + _.nth(parentName, -2);
    }

    function _isNestedState(schemaPath) {
      return schemaPath.split('.').length > 2;
    }

    function _isChild(schemaPath) {
      return schemaPath.split('.').length > 1;
    }

    function _isState(item) {
      var isSchema = item.type === 'Schema' || item.type === 'Subschema';
      var isVisible = item.visible !== false;

      return isSchema && isVisible;
    }

    function _isParent(schema) {
      var subSchemaKey = _.findKey(schema.fields, {type: 'Subschema'});

      return !!subSchemaKey;
    }

    function createBuiltInStates() {
      var datasetsId = {
        name: 'app.datasetsId',
        url: '/datasets/{_id:[0-9A-Fa-f]{24}}',
        views: {
          content: {
            templateUrl: 'app/adp-generator/views/datasets.html',
            controller: 'DatasetController as vm'
          }
        },
        data: {
          title: 'Datasets',
          redirectStrategy: 'user'
        }
      }

      $stateRegistry.register(datasetsId);
    }

    return service;
  }
})();
//
