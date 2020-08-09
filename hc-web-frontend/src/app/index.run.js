(function ()
{
    'use strict';

    angular
        .module('fuse')
        .run(runBlock);

    // runBlock.$inject = ['$rootScope', '$timeout', '$state', '$http', 'CONSTANTS', 'hcSessionService'];
    /** @ngInject */
    function runBlock($rootScope, $timeout, $state, $http, DTDefaultOptions, CONSTANTS, hcSessionService)
    {

        $rootScope.ids = window.ids;

        // Check if user authorized
        hcSessionService.setDefaultHeaders();

        // Activate loading indicator
        var stateChangeStartEvent = $rootScope.$on('$stateChangeStart', function ()
        {
            $rootScope.loadingProgress = true;
        });

        // De-activate loading indicator
        var stateChangeSuccessEvent = $rootScope.$on('$stateChangeSuccess', function (event, toState, toParams, fromState, fromParams, options)
        {

            if (toState.name !== 'app.login' && toState.name !== 'app.register' && toState.name !== 'app.mfaVerification') {
                if (!hcSessionService.getToken()) {
                    hcSessionService.handleAnauthorized();
                }
            }

            $timeout(function ()
            {
                $rootScope.loadingProgress = false;
            });

        });

        // Store state in the root scope for easy access
        $rootScope.state = $state;

        // Cleanup
        $rootScope.$on('$destroy', function ()
        {
            stateChangeStartEvent();
            stateChangeSuccessEvent();
        });


        // Getting lists
        if (appModelHelpers.Lists) {
            $rootScope.lists = appModelHelpers.Lists;
        } else {
            $http.get(CONSTANTS.apiUrl + 'lists')
                .then(function (response) {
                    $rootScope.lists = response.data.data;
                });
        }

        // Getting User
        hcSessionService.getUserData();


        $rootScope.height = [Array(10), Array(12)];
        _.each($rootScope.height, function (value, index) {
            _.each($rootScope.height[index], function (val, i) {
                $rootScope.height[index][i] = i;
            });
        });

        // Datatables settings
        DTDefaultOptions.setLoadingTemplate('<br>');


        // get userAgent data
        $rootScope.isIE = null;

        function msieversion() {
            // Internet Explorer 6-11
            var isIE = /*@cc_on!@*/false || !!document.documentMode;
            $rootScope.isIE = isIE;
            return false;
        };
        msieversion();

    }
})();
