;(function($) {
  "use strict";

  $.fn.smartCollapseToggle = function() {

    return this.each(function() {
      var $body = $('body');
      var $this = $(this);


      // only if not  'menu-on-top'
      if (!$body.hasClass('menu-on-top')) {
        // toggle open
        $this.toggleClass('open');
        if ($body.hasClass('mobile-view-activated')) return;

        // for minified menu collapse only second level
        if ($body.hasClass('minified')) {
          if ($this.closest('nav ul ul').length) {
            $this.find('ul:first').slideToggle(appConfig.menu_speed || 200);
          }
        } else {
          // toggle expand item
          $this.find('ul:first').slideToggle(appConfig.menu_speed || 200);
        }
      }
    });
  };

})(jQuery)

;(function() {
  "use strict";

  angular
    .module('SmartAdmin.Layout')
    .directive('smartMenu', smartMenu);

  function smartMenu(AdpUiActionsService) {
    return {
      restrict: 'A',
      link: function (scope, element) {
        var $body = $('body');

        var $collapsible = element.find('li[data-menu-collapse]');

        var bindEvents = function(){
          $collapsible.each(function (idx, li) {
            var $li = $(li);
            $li
              .on('click', '>a', function (e) {

                // collapse all open siblings
                $li.siblings('.open').smartCollapseToggle();

                // toggle element
                $li.smartCollapseToggle();

                // add active marker to collapsed element if it has active childs
                if (!$li.hasClass('open') && $li.find('li.active').length > 0) {
                  $li.addClass('active')
                }

                e.preventDefault();
              })
              .find('>a').append('<b class="collapse-sign"><em class="fa collapse-icon"></em></b>');

            // initialization toggle
            if ($li.find('li.active').length) {
              // $li.smartCollapseToggle();
              $li.find('li.active').parents('li').addClass('active');
            }
          });
        };
        bindEvents();


        // click on route link
        element.on('click', 'a[ui-sref]', function (e) {
          if ($body.hasClass('mobile-view-activated')) {
            AdpUiActionsService.toggleMenu();
          }
        });


        scope.$on('$smartLayoutMenuOnTop', function (event, menuOnTop) {
          if (menuOnTop) {
            $collapsible.filter('.open').smartCollapseToggle();
          }
        });
      }
    }
  }
})();