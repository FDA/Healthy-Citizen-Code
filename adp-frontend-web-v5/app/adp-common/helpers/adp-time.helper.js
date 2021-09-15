;(function () {
  angular
    .module("app.adpCommon")
    .factory("AdpTime", AdpTime);

  function AdpTime() {
    return {
      guessTimeZone: guessTimeZone,
    }

    function guessTimeZone() {
      try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
      } catch (e) {
        return '';
      }
    }
  }
})();
