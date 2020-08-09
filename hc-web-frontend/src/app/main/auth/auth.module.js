(function ()
{
    'use strict';

    angular
        .module('app.auth', [
            'app.auth.login',
            'app.auth.register',
            'app.auth.passcode',
            'app.auth.verify'
        ])
        .config(config);

    /** @ngInject */
    function config()
    {

        // Navigation

    }

})();
