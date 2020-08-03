;(function () {
  angular
    .module('app.adpForms')
    .constant('adpAceJshintOptions', {
      esnext: true,
      moz: true,
      devel: true,
      browser: true,
      node: true,
      laxcomma: true,
      laxbreak: true,
      lastsemic: true,
      onevar: false,
      passfail: false,
      maxerr: 100,
      expr: true,
      multistr: true,
      globalstrict: true,
      debug: true,
    });
})();
