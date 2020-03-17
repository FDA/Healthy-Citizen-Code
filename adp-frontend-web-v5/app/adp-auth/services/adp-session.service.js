;(function () {
  'use strict';

  angular
    .module('app.adpAuth')
    .factory('AdpSessionService', AdpSessionService);

  /** @ngInject */
  function AdpSessionService(
    $http,
    APP_CONFIG,
    $state,
    $location,
    AdpNotificationService,
    AdpAppModel,
    ResponseError
  ) {
    return {
      login: login,
      logout: logout,
      forgot: forgot,
      reset: reset,
      handleUnauthorized: handleUnauthorized,
      setAuthHeaders: setAuthHeaders,
      setAjaxAuthHeaders: setAjaxAuthHeaders,
      getAuthHeaders: getAuthHeaders
    };

    function login(credentials) {
      return $http.post(APP_CONFIG.apiUrl + '/login', credentials)
        .then(setupAppForUser)
        .catch(function(){
          throw new ResponseError('Unable to connect to the server. Please try again later');
        });
    }

    function setupAppForUser(userData) {
      lsService.setUserData(userData.data.data);

      return AdpAppModel.getAppModel(userData)
        .then(afterLoginRedirect);
    }

    function logout() {
      lsService.removeUserData();
      lsService.setGuestUserData();

      return AdpAppModel.getAppModel()
        .then(function () {
          var authSetting = window.adpAppStore.appInterface().app.auth;
          if (authSetting.requireAuthentication) {
            return $state.go('auth.login', {returnUrl: encodeURI($location.url())});
          } else {
            $state.go($state.current.name, {}, {reload: 'app'});
          }
        })
    }

    function forgot(params) {
      return $http.post(APP_CONFIG.apiUrl + '/forgot', params)
        .then(function (res) {
          if (!res.data.success) {
            throw new ResponseError(res.data.message);
          }

          var message = "Reset link is sent to '" + params.email + "'. Please click on the link in the message to reset your password"
          AdpNotificationService.notifySuccess(message);
          return res;
        });
    }

    function reset(params) {
      return $http.post(APP_CONFIG.apiUrl + '/reset', {password: params.password, token:$state.params.token})
    }

    function handleUnauthorized() {
      return logout()
        .then(function () {
          var message = getSessionExpMessage();
          AdpNotificationService.notifyError(message);
        });
    }

    function getSessionExpMessage() {
      var guestMessage = 'Session is expired. You may proceed as Guest or login again.';
      var defaultMessage = 'Session is expired. Please login again';
      var authSetting = window.adpAppStore.appInterface().app.auth;

      return authSetting.requireAuthentication ? defaultMessage : guestMessage;
    }

    function afterLoginRedirect() {
      var targetUrl = window.adpAppStore.defaultState().url;
      var returnUrl = $state.params.returnUrl;

      if (returnUrl) {
        targetUrl = returnUrl;
      }

      return $location.url(decodeURI(targetUrl));
    }

    function setAuthHeaders(config) {
      config['headers']['Authorization'] = getAuthHeaders();
    }

    function setAjaxAuthHeaders() {
      $.ajaxPrefilter(function (options) {
        if (!options.beforeSend) {
          options.beforeSend = function (xhr) {
            xhr.setRequestHeader('Authorization', getAuthHeaders());
          }
        }
      });
    }

    function getAuthHeaders() {
      return 'JWT ' + lsService.getToken();
    }
  }
})();
