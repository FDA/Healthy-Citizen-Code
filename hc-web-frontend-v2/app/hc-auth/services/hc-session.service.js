;(function() {
  'use strict';

  angular
    .module('app.hcAuth')
    .factory('HcSessionService', HcSessionService);

  /** @ngInject */
  function HcSessionService(
    $http,
    CONSTANTS,
    localStorageService,
    $state,
    HcNotificationService
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
      return $http.post(CONSTANTS.apiUrl + '/login', credentials)
        .then(onLoginSuccess)
    }

    function logout() {
      localStorageService.remove('user');
      localStorageService.remove('token');

      $state.go('auth.login');
    }

    function handleUnauthorized(message) {
      logout();
      var messageText = message || 'Session is expired. Please login again';
      HcNotificationService.notifyError(messageText);
    }

    function onLoginSuccess(response) {
      // FIXME
      var data = response.data.data;
      setUser(data.user);
      setToken(data.token);
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
