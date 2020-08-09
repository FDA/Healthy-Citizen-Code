(function ()
{
    'use strict';

    angular
        .module('fuse')
        .controller('MainController', MainController);

    /** @ngInject */
    function MainController($scope, $rootScope)
    {
        // Data

        //////////

        // Remove the splash screen
        $scope.$on('$viewContentAnimationEnded', function (event)
        {
            if ( event.targetScope.$id === $scope.$id ) {
                $rootScope.$broadcast('msSplashScreen::remove');
            }

            setTimeout( function () {
                if ($('md-sidenav ul a.active').length > 1) {
                    $('md-sidenav ul a.active').eq(0).removeClass('active md-accent-bg');
                }
            }, 0);
            
        });
    }
})();