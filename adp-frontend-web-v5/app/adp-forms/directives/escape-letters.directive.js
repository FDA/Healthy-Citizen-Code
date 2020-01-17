;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('escapeLetters', function() {
      return {
        scope: {
          escapeLetters: '='
        },
        link: function(scope, element) {
          if (!scope.escapeLetters) return;
          var E_LOWER_KEY_CODE = 101,
              E_UPPER_KEY_CODE = 69,
              ESCAPE_REGEX = /e|E/;

          element.bind('keypress.escapeLetters', handleInput);
          function handleInput(e) {
            var keyCode = e.keyCode || e.which;

            if (keyCode === E_LOWER_KEY_CODE || keyCode === E_UPPER_KEY_CODE) {
              e.preventDefault();
            }
          }

          element.bind('paste.escapeLetters', handlePaste);
          function handlePaste(e) {
            var clipboardData = e.clipboardData || e.originalEvent.clipboardData || window.clipboardData;
            var pastedData = clipboardData.getData('Text');

            if(ESCAPE_REGEX.test(pastedData)) {
              e.stopPropagation();
              e.preventDefault();
            }
          }

          scope.$on('$destroy', function() {
            element.off('keypress.escapeLetters');
            element.off('paste.escapeLetters');
          });
        }
      };
    });
})();