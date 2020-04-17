;(function (window) {
  'use strict';

  var $http = angular.injector(['ng']).get('$http');
  var APP_CONFIG = getAppConfig();

  document.addEventListener('DOMContentLoaded', initApp);

  function createAppStore() {
    var store = {
      'SCHEMAS': {},
      'INTERFACE': {},
      'MEDIA_TYPES': {},
      'DEFAULT_STATE': {},
      'MENU_ITEMS': {}
    };

    function _getOrSet(key, value) {
      if (value) {
        return store[key] = value;
      } else {
        return store[key];
      }
    }

    function setStore(data) {
      _getOrSet('SCHEMAS', data.models);
      _getOrSet('INTERFACE', data.interface);
      _getOrSet('MEDIA_TYPES', data.mediaTypes);
      _getOrSet('METASCHEMA', data.metaschema);
    }

    return {
      appModel: function (value) {
        return _getOrSet('SCHEMAS', value);
      },
      appInterface: function (value) {
        return _getOrSet('INTERFACE', value);
      },
      mediaTypes: function (value) {
        return _getOrSet('MEDIA_TYPES', value);
      },
      menuItems: function (value) {
        return _getOrSet('MENU_ITEMS', value);
      },
      defaultState: function (value) {
        return _getOrSet('DEFAULT_STATE', value);
      },
      metaschema: function (value) {
        return _getOrSet('METASCHEMA', value);
      },
      setStore: setStore
    }
  }

  function initApp() {
    window.adpAppStore = createAppStore();

    getModel()
      .then(function (data) {
        window.adpAppStore.setStore(data);

        $('[adp-app-page-loader]').remove();
        angular.bootstrap(document, ['app']);
      });
  }

  function getAppConfig() {
    return angular.injector(['ng', 'APP_MODEL_CONFIG']).get('APP_CONFIG');
  }

  function request(options) {
    var token = lsService.getToken();
    var endpoint = [APP_CONFIG.apiUrl, options.endpoint].join('/');

    var req = {
      method: 'GET',
      url: endpoint,
      withCredentials: true
    };

    if (token) {
      req.headers = { 'Authorization': 'JWT ' + token };
    }

    return $http(req);
  }

  function getModel() {
    var endpoint = lsService.isGuest() ? 'build-app-model' : 'app-model';

    return request({endpoint: endpoint})
      .then(function (res) {
        if (res.data.success) {
          return res.data.data;
        } else {
          throw new Error('App init error, while getting app model');
        }
      })
      .catch(function (error) {
        if (error.status === 401) {
          lsService.removeUserData();
          lsService.setGuestUserData();

          return getModel();
        } else {
          console.log('Unexpected error on model fetch.', error);
        }
      });
  }
})(window);
