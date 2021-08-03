;(function () {
  'use strict';

  var LS_KEY_NAME = 'ADP_LAST_ACTIVITY';
  var browserTabUid = Math.round(Math.random() * 1000000);

  angular
    .module('app.adpAuth')
    .factory('AdpUserActivityHelper', AdpUserActivityHelper);

  /** @ngInject */
  function AdpUserActivityHelper(
    $http,
    $timeout,
    $interval,
    $injector
  ) {
    var INTERFACE = window.adpAppStore.appInterface();
    var pingIntervalTime = INTERFACE.app.inactivityLogoutFePingInterval || INTERFACE.app.inactivityLogoutNotificationAppearsFromSessionEnd / 3;
    var lsUpdateIntervalTime = Math.min(pingIntervalTime * 3 / 4, 60000);
    var lastActivity = _getCurrentSec();
    var pingInterval = null;
    var lsUpdateInterval = null;
    var recordUserActivity = _.throttle(function () {
      lastActivity = _getCurrentSec();
    }, 1000);

    return {
      resetUserActivityTimer: resetUserActivityTimer,
      setUserActivityTracker: setUserActivityTracker,
    };

    function _cancelIntervals() {
      $interval.cancel(pingInterval);
      $interval.cancel(lsUpdateInterval);
    }

    function resetUserActivityTimer(skipNewTimer) {
      _cancelIntervals();

      if (skipNewTimer !== true) {
        pingInterval = $interval(_pingUserActivity, pingIntervalTime);
        lsUpdateInterval = $interval(_lsUpdate, lsUpdateIntervalTime);
      }
    }

    function _pingUserActivity() {
      var lsData = _getLsData();
      var now = Date.now();
      var isThisTabLatest = lsData.tabId === browserTabUid;
      var isLatestTabSeemsClosed = lsData.lastActivity > lastActivity && now - lsData.time > pingIntervalTime;

      if (isThisTabLatest || isLatestTabSeemsClosed) {
        if (isLatestTabSeemsClosed) {
          lastActivity = lsData.lastActivity;
        }
        var secAgo = _getCurrentSec() - lastActivity;
        var AdpSessionHelper = $injector.get('AdpSessionHelper'); // Avoiding circular dependency

        AdpSessionHelper.doProlongSession(secAgo);
        _lsUpdate();
      }
    }

    function _lsUpdate() {
      var lsData = _getLsData();

      if (lsData.lastActivity > lastActivity) { // Am not most active tab
        return;
      }

      var data = {
        tabId: browserTabUid,
        time: Date.now(),
        lastActivity: lastActivity,
      };

      localStorage.setItem(LS_KEY_NAME, JSON.stringify(data));
    }

    function _getLsData() {
      var lsData = {};

      try {
        lsData = JSON.parse(localStorage.getItem(LS_KEY_NAME));
      } catch (e) {
      }

      return _.defaults(lsData, {time: 0, lastActivity: 0});
    }

    function setUserActivityTracker(doStart) {
      if (doStart === false) {
        $(document).off('mousemove', recordUserActivity);
        $(document).off('keydown', recordUserActivity);
      } else {
        $(document).on('mousemove', recordUserActivity);
        $(document).on('keydown', recordUserActivity);
      }
    }

    function _getCurrentSec() {
      return Math.floor(Date.now() / 1000);
    }
  }
})();
