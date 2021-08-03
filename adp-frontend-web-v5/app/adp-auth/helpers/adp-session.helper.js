;(function () {
  'use strict';

  angular
    .module('app.adpAuth')
    .factory('AdpSessionHelper', AdpSessionHelper);

  var sessionTimeout = null;
  var tokenRefreshTimeout = null;
  var timerDialogInstance = null;

  /** @ngInject */
  function AdpSessionHelper(
    $http,
    $timeout,
    $interval,
    $injector,
    AdpModalService,
    AdpUserActivityHelper,
    APP_CONFIG
  ) {
    return {
      setTokenRefreshTimeout: setTokenRefreshTimeout,
      setSessionRemainingTimeout: setSessionRemainingTimeout,
      cancelAllTimers: cancelAllTimers,
      doLogout: doLogout,
      doProlongSession: doProlongSession,
    };

    function setSessionRemainingTimeout() {
      var INTERFACE = window.adpAppStore.appInterface();
      var isCheckSessionStatusRequired = INTERFACE.app.isInactivityLogoutEnabled;

      if (isCheckSessionStatusRequired) {
        _checkSessionExpire();
      }
    }

    function _createSessionTimeout(timerMs) {
      _cancelSessionTimeout();
      sessionTimeout = $timeout(_checkSessionExpire, timerMs);
    }

    function _cancelSessionTimeout() {
      $timeout.cancel(sessionTimeout);
    }

    function _checkSessionExpire() {
      _doSessionCheck().then(_onSessionCheck).catch(doLogout);
    }

    function _onSessionCheck(expiresIn) {
      if (!_.isNumber(expiresIn)) {
        return;
      }

      if (expiresIn < _getHowLongBeforeExpireWeShowTimer()) {
        _doOpenTimerDialog(expiresIn);
        _createSessionTimeout(APP_CONFIG.INACTIVITY_LOGOUT_POLLING_INTERVAL);
        AdpUserActivityHelper.resetUserActivityTimer(true);
      } else {
        _doCloseTimerDialog();
        _createSessionTimeout(Math.max(0, expiresIn - _getHowLongBeforeExpireWeShowTimer() + 1000));
        AdpUserActivityHelper.resetUserActivityTimer();
      }
    }

    function _doSessionCheck() {
      var url = APP_CONFIG.apiUrl + '/session-status';

      return $http.post(url)
                  .then(_transformSessionEndResponse)
                  .catch(doLogout);
    }

    function _transformSessionEndResponse(data) {
      if (data.data.success) {
        var timeLeft = data.data.data.sessionEndMs;

        if (timeLeft > 0) {
          return timeLeft;
        }
      }

      throw new Error('No session found. Logout.');
    }

    function doProlongSession(lastActivityIn) {
      var url = APP_CONFIG.apiUrl + '/prolong-session';

      return $http.post(url, {data: {lastActivityIn: lastActivityIn}})
                  .then(_transformSessionEndResponse)
                  .then(_onSessionCheck)
                  .catch(doLogout);
    }

    function _doOpenTimerDialog(sessionEndsAfterMs) {
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
              return doProlongSession(0);
            }
            if (result.logout) {
              doLogout();
            }
          }
        })
        .catch(_.noop)
        .finally(function () {
          timerDialogInstance = null;
        });
    }

    function _doCloseTimerDialog() {
      if (timerDialogInstance) {
        timerDialogInstance.close();
      }
    }

    function setTokenRefreshTimeout(immediate, isLoud) {
      _cancelTokenRefreshTimeout();

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

        timeout = Math.min(timeout, 2000000000);
        tokenRefreshTimeout = $timeout(_tokenRefresh, timeout);

        return Promise.resolve();
      }

      return _tokenRefresh(isLoud);
    }

    function _cancelTokenRefreshTimeout() {
      $timeout.cancel(tokenRefreshTimeout);
    }

    function _tokenRefresh(isLoud) {
      var url = APP_CONFIG.apiUrl + '/refresh-token' + (isLoud ? '' : '?silent=true');

      return $http.post(url)
                  .then(function (data) {
                    if (data.data.success) {
                      _tokenUpdate(data);
                    }
                  })
                  .catch(doLogout);
    }

    function _tokenUpdate(data) {
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
      _cancelSessionTimeout();
      _cancelTokenRefreshTimeout();
    }

    function _getHowLongBeforeExpireWeShowTimer() {
      var INTERFACE = window.adpAppStore.appInterface();

      return INTERFACE.app.inactivityLogoutNotificationAppearsFromSessionEnd;
    }
  }
})();
