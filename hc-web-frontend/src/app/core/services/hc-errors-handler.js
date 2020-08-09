(function ()
{
    'use strict';

    angular
        .module('app.core')
        .factory('hcErrorsHandler', hcErrorsHandler);

    /** @ngInject */
    function hcErrorsHandler($q, hcFlashService)
    {
        var service = {
            handle: handle
        };

        return service;


        // Methods
        function handle (error) {
            console.log(error);
            var message = error.data.message;
            if (typeof message == 'string') {
                hcFlashService.error(error.data.message);
            } else {
                _.each(message, function (value, key) {
                    hcFlashService.error(value.message);
                });
            }
        }

    };
})();
