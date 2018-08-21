;(function (window) {
  'use strict';
  var $http = angular.injector(['ng']).get('$http');

  // todo: replace with module-like object with setters and getters
  window.adpAppStore = (function () {
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
      }
    }
  })();

  // moment.js default language
  moment.locale('en');

  getModel()
    .then(function () {
      $('[adp-app-page-loader]').remove();
      angular.bootstrap(document, ['app']);
    })
    .catch(function (err) {
      console.log(err);
    });

  function getModel() {
    var token;
    try {
      token = JSON.parse(localStorage.getItem('ls.token'));
    } catch (e) {}

    var APP_CONFIG = angular.injector(['ng', 'APP_MODEL_CONFIG']).get('APP_CONFIG');
    var endpoint = [APP_CONFIG.apiUrl, 'app-model'].join('/');

    var req = {
      method: 'GET',
      url: endpoint
    };

    if (token) {
      req.headers = { 'Authorization': 'JWT ' + token };
    }

    return $http(req)
      .then(function (res) {
        var dataRef = res.data.data;

        window.adpAppStore.appModel(dataRef.models);
        window.adpAppStore.appInterface(dataRef.interface);
        window.adpAppStore.mediaTypes(dataRef.mediaTypes);
      });
  }
})(window);
