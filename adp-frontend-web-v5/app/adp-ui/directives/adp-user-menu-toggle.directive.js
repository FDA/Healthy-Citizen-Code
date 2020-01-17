;(function () {
  'use strict';

  angular.module('app')
    .directive('adpUserMenuToggle', adpUserMenuToggle);

  function adpUserMenuToggle($timeout) {
    var INTERFACE = window.adpAppStore.appInterface();

    function initDomEvents($element) {
      var shortcut_dropdown = $('#adp-user-menu');

      $element.on('click', function () {
        if (shortcut_dropdown.is(":visible")) {
          shortcut_buttons_hide();
        } else {
          shortcut_buttons_show();
        }
      });

      shortcut_dropdown.find('a').click(function (e) {
        e.preventDefault();
        window.location = $(this).attr('href');
        setTimeout(shortcut_buttons_hide, 300);
      });


      // SHORTCUT buttons goes away if mouse is clicked outside of the area
      $(document).mouseup(function (e) {
        if (shortcut_dropdown && !shortcut_dropdown.is(e.target) && shortcut_dropdown.has(e.target).length === 0) {
          shortcut_buttons_hide();
        }
      });

      // SHORTCUT ANIMATE HIDE
      function shortcut_buttons_hide() {
        shortcut_dropdown.animate({
          height: "hide"
        }, 300, "easeOutCirc");
        $('body').removeClass('shortcut-on');
      }

      // SHORTCUT ANIMATE SHOW
      function shortcut_buttons_show() {
        shortcut_dropdown.animate({
          height: "show"
        }, 200, "easeOutCirc");
        $('body').addClass('shortcut-on');
      }
    }

    return {
      restrict: 'EA',
      link: function ($scope, $element) {
        if (!INTERFACE.header.components.userMenu) return;

        $timeout(function () {
          initDomEvents($element);
        });
      }
    }
  }
})();