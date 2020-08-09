;(function() {
  'use strict';

  angular
    .module('app.hcGenerator')
    .provider('HcState', HcState);

  var contents = {
    'dashboard': {
      controller: 'DashboardController as vm',
      templateUrl: 'app/hc-generator/views/dashboard.html'
    },
    'singleRecord': {
      controller: 'SingleRecordController as vm',
      templateUrl: 'app/hc-generator/views/single-record.html'
    },
    'details': {
      controller: 'DetailsController as vm',
      templateUrl: 'app/hc-generator/views/details.html'
    },
    'multiRecord': {
      controller: 'MultiRecordController as vm',
      templateUrl: 'app/hc-generator/views/multi-record.html'
    },
    'multiRecordNested': {
      controller: 'MultiRecordNestedController as vm',
      templateUrl: 'app/hc-generator/views/multi-record-nested.html'
    },
    'customPage': function (pageParams) {
      return {
        controller: pageParams.controller + ' as vm',
        template: pageParams.template
      }
    }
  };

  var stateDefault = {
    url: '',
    views: {
      content: {}
    },
    params: {addRecord: null},
    data: {}
  };

  /** @ngInject */
  function HcState(
    $stateProvider,
    SCHEMAS,
    APP_PREFIX
  ) {
    var service = {
      createRoutes: createRoutes,
      createDashboards: createDashboards,
      createCustomPages: createCustomPages,
      parseUrlParams: parseUrlParams,
      $get: function() {
        return service;
      }
    };

    //============== METHODS

    function createRoutes(schema, interfaceConfig, parentStateName) {
      _.each(schema, function (item, key) {
        if (!_isState(item)) return;

        var state = _createState(item, key, parentStateName);

        if (_isParent(item)) {
          var parent = parentStateName ? parentStateName + '.' + key : key;

          if (!item.singleRecord) {
            _createDetailsState(state);

            state.data.pageParams.hasDetails = true;
          }

          createRoutes(item.fields, interfaceConfig, parent);
        }

        var isStateCustomPage = _.find(interfaceConfig.pages, function (page) {
          return page.link === state.url;
        });

        if (!isStateCustomPage) {
          $stateProvider.state('app.' + key, state);
        }
      });
    }

    function createDashboards(mainMenuConfig) {
      _.each(mainMenuConfig, function (item) {
        if (item.type !== 'MenuDashboardLink') return;
        _createDashboardState(item);
      });
    }

    function createCustomPages(interfaceConfig) {
      _.each(interfaceConfig.pages, _createCustomPageState);
    }

    //============== Private methods

    function _createDetailsState(state) {
      var state = _.clone(state);

      state.name = state.name + 'Details';
      // TODO: resolve state defenition
      state.url = state.url + '/id=:id';
      state.views = {
        content: contents['details']
      }

      $stateProvider.state('app.' + state.name, state);
    }

    function _createDashboardState(dashboardItemConfig) {
      var state = _.clone(stateDefault);

      state.url = '/' + dashboardItemConfig.link;
      state.data.redirectStrategy = 'user';
      state.data.title = dashboardItemConfig.title;
      state.views = {
        content: contents['dashboard']
      }

      $stateProvider.state(dashboardItemConfig.stateName, state);
    }

    function _createCustomPageState(pageParams, name) {
      var state = _.cloneDeep(stateDefault);
      var stateName = 'app.' + name;

      state.url = _addRulesToUrlParams(pageParams.link);

      state.data = _.extend({
        redirectStrategy: 'user',
        title: pageParams.fullName
      }, pageParams);

      state.views = {
        content: contents.customPage(pageParams)
      };

      $stateProvider.state(stateName, state);
    }

    function _addRulesToUrlParams(link) {
      var linkToFormat = link.toLowerCase();
      // regex for mongo _id - 24 chars length hex number
      var hexNumberRegex = "[0-9A-Fa-f]{24}";

      return linkToFormat.replace(/\/:([a-zA-Z]+)\//g, function (_, idName) {
        return ['/{', idName, ':',  hexNumberRegex,'}/', ].join('');
      });
    }

    function parseUrlParams(link) {
      var user = _getCurrentUser();

      var linkToFormat = link.toLowerCase();

      return linkToFormat.replace(/\/:([a-zA-Z]+)\//g, function (_, idName) {
        return ['/', user[idName], '/'].join('');
      });
    }

    function _getCurrentUser() {
      var userString = localStorage.getItem(APP_PREFIX + '.user');

      try {
        return JSON.parse(userString);
      } catch (e) {}
    }

    function _createState(schemaItem, schemaName, parentSchemaPath) {
      var state = _.clone(stateDefault);
      var schemaPath = _getSchemaPath(schemaName, parentSchemaPath);

      state.url = _getStateUrl(schemaPath);
      state.data = _getPageData(schemaItem, schemaName, schemaPath);
      state.name = schemaName;
      state.views = _getPageContent(schemaPath);

      return state;
    }

    function _getStateUrl(schemaPath) {
      var url = '/' + schemaPath.replace(/\./g, '/');

      return url;
    }

    function _getSchemaPath(schemaName, parentSchemaPath) {
      var schemaPath = schemaName;

      if (parentSchemaPath) {
        schemaPath = parentSchemaPath + '.' + schemaPath;
      }

      return schemaPath;
    }

    function _getPageData(schemaItem, schemaName, schemaPath) {
      return {
        title: schemaItem.fullName,
        pageParams: _getPageParams(schemaItem, schemaName, schemaPath),
        // atm: assuming that all states are restricted only to authorized users
        // TODO: change later
        redirectStrategy: 'user'
      };
    }

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

    function _getPageContent(schemaPath) {
      var schema = _getSchema(schemaPath);
      var pageType;

      // Details page

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

      return _.get(SCHEMAS, schemaPath);
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
      var subschemaKey = _.findKey(schema.fields, {type: 'Subschema'});

      return !!subschemaKey;
    }


    return service;
  }
})();
