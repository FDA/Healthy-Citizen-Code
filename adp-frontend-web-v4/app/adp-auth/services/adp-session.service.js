;(function() {
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
    AdpAppModel
  ) {
    return {
      login: login,
      logout: logout,
      handleUnauthorized: handleUnauthorized,
      setAuthHeaders: setAuthHeaders,
      setAjaxAuthHeaders: setAjaxAuthHeaders,
      getAuthHeaders: getAuthHeaders
    };

    function login(credentials) {
      var fromNetwork = function () {
        return $http.post(APP_CONFIG.apiUrl + '/login', credentials)
          .then(function (res) {
            var userData = res.data.data;
            return appDb.login.set(userData);
          });
      };

      return fromNetwork()
        .then(setupAppForUser)
        .catch(function (err) {
          if (err.status === -1) {
            console.warn('Login request failed. Falling back to cached version.', err);
            loginFromCache();
          }
        })
    }

    function loginFromCache() {
      appDb.login.get()
        .then(function (userData) {
          if (_.isEmpty(userData)) {
            throw 'cache:user_not_found';
          }

          setupAppForUser(userData);
        })
        .catch(function (err) {
          if (err === 'cache:user_not_found') {
            var message = 'Invalid credentials.';
            AdpNotificationService.notifyError(message);
          } else {
            console.warn('Uncatched error while logging from cache');
          }
        })
    }

    function setupAppForUser(userData) {
      lsService.setUserData(userData);

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
            return $state.go('auth.login', { returnState: $state.current.name });
          } else {
            $state.go($state.current.name, {}, {reload: 'app'});
          }
        })
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
      var returnUrl = $state.params.returnUrl;

      if (returnUrl) {
        $location.path(returnUrl);
        $location.search('');
        return;
      }

      var defaultState = window.adpAppStore.defaultState().stateName;
      var returnState = $state.params.returnState ||
        window.adpAppStore.defaultState().stateName;

      returnState = returnState === 'auth.login' ? defaultState : returnState;

      return $state.go(returnState);
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
      return 'JWT ' + lsService.getToken();
    }
  }
})();
