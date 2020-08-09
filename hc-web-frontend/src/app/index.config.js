(function ()
{
    'use strict';

    angular
        .module('fuse')
        .factory('unauthorizedHandler', factory)
        .config(datePickerConfig)
        .config(config);

    /** @ngInject */
    function datePickerConfig($mdDateLocaleProvider){
        var format = 'M/D/YYYY';

        $mdDateLocaleProvider.formatDate = function(date) {
            return date ? moment(date).format(format) : '';
        };

        $mdDateLocaleProvider.parseDate = function(dateString) {
            var d = moment(dateString, format, true);
            return d.isValid() ? d.toDate() : new Date(NaN);
        };
    }

    /** @ngInject */
    function config(
      $translateProvider,
      $locationProvider,
      $httpProvider,
      $mdDateLocaleProvider,
      CONSTANTS,
      localStorageServiceProvider,
      hcSchemaGeneratorServiceProvider
    ) {
        // Put your common app configurations here
        localStorageServiceProvider
          .setPrefix('hc');


        $locationProvider.html5Mode(false);

        // angular-translate configuration
        $translateProvider.useLoader('$translatePartialLoader', {
            urlTemplate: '{part}/i18n/{lang}.json'
        });
        $translateProvider.preferredLanguage('en');
        $translateProvider.useSanitizeValueStrategy('sanitize');

        if (localStorage.getItem('hc.user')) {
            var user = JSON.parse(localStorage.getItem('hc.user'));
            window.ids = {
                'phis': user.phiId,
                'piis': user.piiId
            }
        }


        /////////////////////
        // Generate routes //
        /////////////////////

        function createRoutes () {
            hcSchemaGeneratorServiceProvider.handleInterface(window.interface.main_menu);
        };

        // Load schemas and routes config
        createRoutes();

        // Inject HTTP interceptor
        $httpProvider.interceptors.push('unauthorizedHandler');

    }


    function factory ($q, $injector) {
        var unauthorizedHandler = {
            responseError: function(response) {
                if (response.status == 401) {
                    var hcSessionService = $injector.get('hcSessionService');
                    var deferred = $q.defer();

                    hcSessionService.handleAnauthorized(response);

                    return deferred.promise.then(function() {
                        return $http(response.config);
                    });
                }

                return $q.reject(response);

            }
        };

        return unauthorizedHandler;
    };

})();
