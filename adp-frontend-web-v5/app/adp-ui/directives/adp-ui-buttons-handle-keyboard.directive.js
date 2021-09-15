;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpUiButtonsHandleKeyboard', adpUiButtonsHandleKeyboard);

  function adpUiButtonsHandleKeyboard() {
    return {
      restrict: 'A',
      scope: false,
      link: function (scope, element) {
        var modalDialogSelector = "div.modal[role='dialog']";
        var isSingleButton = $(element).attr('adp-ui-buttons-handle-keyboard') === 'single';

        $(window).on('keydown', onDirectiveKeyPress);

        scope.$on('$destroy', function(){
          $(window).off('keydown', onDirectiveKeyPress);
        });

        function onDirectiveKeyPress(e) {
          var activeElem = document.activeElement;

          if (e.code === 'Escape') {

            var modalDialogElem = getIfRightElementActive(activeElem, true);

            if (modalDialogElem) {
              var affectedButtonSelector = isSingleButton ? '.adp-action-b-primary' : '.adp-action-b-secondary';
              pressButton(modalDialogElem, element, affectedButtonSelector);
            }
          }
          if (e.code === 'Enter' && !!getIfRightElementActive(activeElem)) {
            pressButton(activeElem, element, '.adp-action-b-primary');
            e.stopPropagation();
          }
        }

        function pressButton(activeRoot, element, selector) {
          var buttonElem = $(activeRoot).find(element).find(selector);

          if (buttonElem) {
            buttonElem.trigger('click');
          }
        }

        function getIfRightElementActive(elem, checkUpwards) {
          if ($(elem).is(modalDialogSelector)) {
            return elem;
          }

          if (checkUpwards) {
            var closest = $(elem).closest(modalDialogSelector);

            if (closest.length) {
              return closest[0];
            }
          }

          return false;
        }
      }
    }
  }
})();
