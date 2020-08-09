(function() {
    'use strict';

    angular
        .module('app.core')
        .directive('hcLogo', hcLogoDirective);

    /** @ngInject */
    function hcLogoDirective($rootScope, CONSTANTS) {
        return {
            restrict: 'E',
            scope: {
                src: '@'
            },
            link: function (scope, element) {
                var pictureUrl = getImageUrl(scope.src);
                var picture = "<img src="+ pictureUrl +" class='logo__image'/>";

                element.html(picture);

                function getAbsoluteUrl(url) {
                    return url.charAt(0) === '/' ? CONSTANTS.apiUrl + url : url;
                }

                function getImageUrl(src) {
                    var imageSource = src;

                    if ($rootScope.isIE) {
                        imageSource = imageSource.split('.').join('IE.');
                    }

                    // return 'background-image:url(' + getAbsoluteUrl(imageSource) + ')';
                    return getAbsoluteUrl(imageSource);
                }
            }
        };
    }
})();
