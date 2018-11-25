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
    AdpAppModel
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
      var fromNetwork = function () {
        return $http.post(APP_CONFIG.apiUrl + '/login', credentials)
          .then(function (res) {
            var dataRef = res.data.data;

            return appDb.login.set(dataRef)
              .then(function () {
                return dataRef;
              });
          })
          // .catch(function (err) {
          //   console.warn('APP MODEL request failed. Falling back to cached version.', err);
          //   return appDb.login.get();
          // });
      };

      return fromNetwork()
        .then(function (data) {
          return AdpAppModel.getAppModel(data)
            .then(function () {
              return onLoginSuccess(data);
            });
        });
    }

    function logout() {
      localStorageService.remove('user');
      localStorageService.remove('token');

      $state.go('auth.login', { returnState: $state.current.name });
    }

    function handleUnauthorized(message) {
      logout();
      var messageText = message || 'Session is expired. Please login again';
      AdpNotificationService.notifyError(messageText);
    }

    function onLoginSuccess(data) {
      setUser(data.user);
      setToken(data.token);
      return afterLoginRedirect();
    }

    function afterLoginRedirect() {
      var returnState = $state.params.returnState || window.adpAppStore.defaultState().stateName;

      return $state.go(returnState);
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
  }
})();
