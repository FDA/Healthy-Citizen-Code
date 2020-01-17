

'use strict';

angular
    .module('SmartAdmin.Layout')
    .directive('smartPageTitle', function (
        $rootScope,
        $timeout,
        $transitions
    ) {
    return {
        restrict: 'A',
        compile: function (element, attributes) {
            element.removeAttr('smart-page-title data-smart-page-title');

            var defaultTitle = attributes.smartPageTitle;

            var listener = function(transition) {
                var toState = transition.to();
                var title = defaultTitle;

                if (toState.data && toState.data.title) {
                    title = toState.data.title + ' | ' + title;
                }

                // Set asynchronously so page changes before title does
                $timeout(function() {
                    $('html head title').text(title);
                });
            };

            $transitions.onStart(null, listener);
        }
    }
});