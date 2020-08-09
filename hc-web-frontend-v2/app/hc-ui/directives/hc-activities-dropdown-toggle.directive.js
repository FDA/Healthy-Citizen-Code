;(function () {
  'use strict';

  angular.module('app.hcUi')
    .directive('hcActivitiesDropdownToggle', function() {
      return{
        restrict:'EA',
        link: function($scope, $element){
          var ajax_dropdown = null;

          $element.on('click',function(){
            var badge = $(this).find('.badge');

            if (badge.hasClass('bg-color-red')) {
              badge.removeClass('bg-color-red').text(0);
            }

            ajax_dropdown = $(this).next('.ajax-dropdown');

            if (!ajax_dropdown.is(':visible')) {
              ajax_dropdown.fadeIn(150);
              $(this).addClass('active');
            } else {
              ajax_dropdown.fadeOut(150);
              $(this).removeClass('active');
            }
          });

          $(document).mouseup(function(e) {
            if (ajax_dropdown && !ajax_dropdown.is(e.target) && ajax_dropdown.has(e.target).length === 0) {
              ajax_dropdown.fadeOut(150);
              $element.removeClass('active');
            }
          });
        }
      }
    });
})();
