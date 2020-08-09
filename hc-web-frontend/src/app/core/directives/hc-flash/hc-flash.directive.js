(function() {
    'use strict';

    angular
        .module('app.core')
        .directive('hcFlash', hcFlashDirective);

    /** @ngInject */
    function hcFlashDirective($rootScope, hcFlashService) {
        return {
            restrict: 'E',
            link: function (scope, element) {
                $rootScope.$on('event:flashMessage', function () {

                    var flash = hcFlashService.getMessage();

                    var flashElement = $('<div class="alert alert-' + flash.type + '">' + flash.message + '</div>');

                    scope.clicked = function (ev) {
                        var target = $(ev.currentTarget);

                        $(target).slideUp().delay(1000).queue(function () {
                            target.remove();
                        })
                    };

                    flashElement.appendTo(element).slideDown();
                    flashElement.bind('click', scope.clicked);

                    setTimeout(function () {
                        flashElement.slideUp().delay(1000).queue(function () {
                            flashElement.remove();
                        })
                    }, 4000);

                });
            }
        };
    }
})();
