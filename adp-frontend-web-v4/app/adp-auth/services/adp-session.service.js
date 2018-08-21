;(function() {
  'use strict';

  angular
    .module('app.adpAuth')
    .factory('AdpSessionService', AdpSessionService);

  /** @ngInject */
  function AdpSessionService(
    $http,
    APP_CONFIG,
    localStorageService,
    $state,
    AdpNotificationService,
    $stateRegistry,
    AppGenerator
  ) {
    return {
      login: login,
      logout: logout,
      isAuthorized: isAuthorized,
      getUser: getUser,
      handleUnauthorized: handleUnauthorized,
      setAuthHeaders: setAuthHeaders,
      setAjaxAuthHeaders: setAjaxAuthHeaders,
      getAuthHeaders: getAuthHeaders
    };

    function login(credentials) {
      return $http.post(APP_CONFIG.apiUrl + '/login', credentials)
        .then(function (res) {
          var dataRef = res.data.data;

          return getAppModel(dataRef.token)
            .then(function () {
              return onLoginSuccess(res);
            })
        });
    }

    function logout() {
      localStorageService.remove('user');
      localStorageService.remove('token');
      $state.go('auth.login');
    }

    function handleUnauthorized(message) {
      logout();
      var messageText = message || 'Session is expired. Please login again';
      AdpNotificationService.notifyError(messageText);
    }

    function onLoginSuccess(res) {
      var dataRef = res.data.data;
      setUser(dataRef.user);
      setToken(dataRef.token);
    }

    function setUser (user) {
      localStorageService.set('user', user);
    }

    function getUser() {
      return localStorageService.get('user');
    }

    function setToken (token) {
      localStorageService.set('token', token)
    }

    function getToken () {
      return localStorageService.get('token');
    }

    function isAuthorized() {
      return !!getToken();
    }

    function setAuthHeaders (config) {
      config['headers']['Authorization'] = getAuthHeaders();
    }

    function setAjaxAuthHeaders () {
      $.ajaxPrefilter(function( options ) {
        if (!options.beforeSend) {
          options.beforeSend = function (xhr) {
            xhr.setRequestHeader('Authorization', getAuthHeaders());
          }
        }
      });
    }

    function getAuthHeaders () {
      return 'JWT ' + getToken();
    }

    function getAppModel(token) {
      var req = {
        method: 'GET',
        url: [APP_CONFIG.apiUrl, 'app-model'].join('/')
      };

      if (token) {
        req.headers = {
          'Authorization': 'JWT ' + token
        };
      }

      return $http(req)
        .then(_regenerateApp)
        .catch(function (err) { console.log(err) });
    }

    function _regenerateApp(res) {
      var dataRef = res.data.data;

      _.each($stateRegistry.states, function (state) {
        if (_.startsWith(state.name, 'app.')) {
          $stateRegistry.deregister(state.name);
        }
      });

      window.adpAppStore.appModel(dataRef.models);
      window.adpAppStore.appInterface(dataRef.interface);
      window.adpAppStore.mediaTypes(dataRef.mediaTypes);

      AppGenerator.generateApp();

      return res;
    }
  }
})();
