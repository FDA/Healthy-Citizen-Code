;(function () {
  'use strict';

  angular
    .module('app.adpAuth')
    .factory('AdpSessionHelper', AdpSessionHelper);

  var sessionRemainingTimeout = null;
  var sessionPollingInterval = null;
  var tokenRefreshTimeout = null;
  var timerDialogInstance = null;

  /** @ngInject */
  function AdpSessionHelper(
    $http,
    $timeout,
    $interval,
    $injector,
    AdpModalService,
    APP_CONFIG
  ) {
    return {
      setTokenRefreshTimeout: setTokenRefreshTimeout,
      setSessionRemainingTimeout: setSessionRemainingTimeout,
      cancelAllTimers: cancelAllTimers,
      doLogout: doLogout,
    };

    function setSessionRemainingTimeout() {
      var INTERFACE = window.adpAppStore.appInterface();
      var isCheckSessionStatusRequired = INTERFACE.app.isInactivityLogoutEnabled;

      if (isCheckSessionStatusRequired) {
        doSessionCheck()
          .then(createSessionRemainingTimeout)
          .catch(doLogout);
      }
    }

    function createSessionRemainingTimeout(expiresIn) {
      if (!_.isNumber(expiresIn)) {
        return;
      }
      var timerMs = Math.max(0, expiresIn - getHowLongBeforeExpireWeShowTimer() + 1000);

      cancelSessionRemainingTimeout();
      sessionRemainingTimeout = $timeout(onSessionRemainingTimeout, timerMs);
    }

    function onSessionRemainingTimeout() {
      doSessionCheck().then(
        function (expiresIn) {
          if (expiresIn < getHowLongBeforeExpireWeShowTimer()) {
            doOpenTimerDialog(expiresIn);
            setSessionRemainingPollingInterval();
          } else {
            createSessionRemainingTimeout(expiresIn);
          }
        }
      )
    }

    function setSessionRemainingPollingInterval() {
      var timerMs = APP_CONFIG.INACTIVITY_LOGOUT_POLLING_INTERVAL;

      cancelSessionPollingInterval();

      sessionPollingInterval = $interval(onSessionRemainingPolling, timerMs);
    }

    function onSessionRemainingPolling() {
      doSessionCheck().then(
        function (expiresIn) {
          if (getHowLongBeforeExpireWeShowTimer() < expiresIn) {
            doCloseTimerDialog();
            createSessionRemainingTimeout(expiresIn);
          }
        }
      )
    }

    function cancelSessionRemainingTimeout() {
      $timeout.cancel(sessionRemainingTimeout);
    }

    function cancelSessionPollingInterval() {
      $interval.cancel(sessionPollingInterval);
    }

    function doSessionCheck() {
      var url = APP_CONFIG.apiUrl + '/session-status';

      return $http.post(url)
                  .then(onSessionCheck)
                  .catch(doLogout);
    }

    function onSessionCheck(data) {
      if (data.data.success) {
        var timeLeft = data.data.data.sessionEndMs;

        if (timeLeft > 0) {
          return timeLeft;
        }
      }

      throw new Error('No session found. Logout.');
    }

    function doProlongSession() {
      var url = APP_CONFIG.apiUrl + '/prolong-session';

      return $http.post(url)
                  .then(onSessionCheck)
                  .then(createSessionRemainingTimeout)
                  .catch(doLogout);
    }

    function doOpenTimerDialog(sessionEndsAfterMs) {
      if (timerDialogInstance) {
        return;
      }

      timerDialogInstance = AdpModalService
        .createModal(
          'adpInactivityLogoutDialogModal',
          {
            timeout: sessionEndsAfterMs,
          });

      timerDialogInstance
        .result
        .then(function (result) {
          if (result) {
            if (result.prolong) {
              return doProlongSession();
            }
            if (result.logout) {
              doLogout();
            }
          }
        })
        .catch(_.noop)
        .finally(function () {
          timerDialogInstance = null;
          cancelSessionPollingInterval();
        });
    }

    function doCloseTimerDialog() {
      if (timerDialogInstance) {
        timerDialogInstance.close();
      }
    }

    function setTokenRefreshTimeout(immediate, isLoud) {
      cancelTokenRefreshTimeout();

      if (!immediate) {
        var timeout;

        try {
          timeout = new Date(lsService.getTokenExpire()).getTime() - new Date().getTime();
        } catch (e) {
          timeout = 0;
        }

        if (timeout > APP_CONFIG.JWT_ACCESS_TOKEN_REFRESH_BEFORE_EXPIRE) {
          timeout -= APP_CONFIG.JWT_ACCESS_TOKEN_REFRESH_BEFORE_EXPIRE;
        } else {
          timeout /= 2;
        }

        tokenRefreshTimeout = $timeout(tokenRefresh, timeout);

        return Promise.resolve();
      }

      return tokenRefresh(isLoud);
    }

    function cancelTokenRefreshTimeout() {
      $timeout.cancel(tokenRefreshTimeout);
    }

    function tokenRefresh(isLoud) {
      var url = APP_CONFIG.apiUrl + '/refresh-token' + (isLoud ? '' : '?silent=true');

      return $http.post(url)
                  .then(function (data) {
                    if (data.data.success) {
                      tokenUpdate(data);
                    }
                  })
                  .catch(doLogout);
    }

    function tokenUpdate(data) {
      var updatedUserData = {
        token: data.data.token,
        expiresIn: data.data.expiresIn,
        user: lsService.getUser()
      }

      lsService.setUserData(updatedUserData);
      setTokenRefreshTimeout();
    }

    function doLogout() {
      var AdpSessionService = $injector.get('AdpSessionService'); // avoiding circular dependency
      AdpSessionService.logout();
    }

    function cancelAllTimers() {
      cancelSessionRemainingTimeout();
      cancelSessionPollingInterval();
      cancelTokenRefreshTimeout();
    }

    function getHowLongBeforeExpireWeShowTimer() {
      var INTERFACE = window.adpAppStore.appInterface();

      return INTERFACE.app.inactivityLogoutNotificationAppearsFromSessionEnd;
    }
  }
})();
