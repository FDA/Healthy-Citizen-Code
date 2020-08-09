(function ()
{
    'use strict';

    angular
        .module('app.homePage')
        .controller('HomePageController', HomePageController);

    /** @ngInject */
    function HomePageController($scope, $state, $stateParams, $mdDialog, CONSTANTS, $http, $rootScope, api, hcFlashService)
    {

        // Data
        var vm = this;

        // Actions
        vm.view = function (link) {
            $state.go('app' + link.split('/').join('.'));
        };

        vm.add = function (link) {
            $state.go('app' + link.split('/').join('.'), {'addRecord': true});
        };

        $http.get(CONSTANTS.apiUrl + '/dashboards/mainDashboard/data')
            .then(function (response) {
                vm.dashboardData = response.data.data;
            });

        // TODO: Change
        vm.dashboardItems = window.interface.mainDashboard.fields;
    }
})();
