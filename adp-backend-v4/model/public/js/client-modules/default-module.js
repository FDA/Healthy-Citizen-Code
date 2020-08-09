;(function () {
    "use strict";

    // Implementing custmi page linked to datatables basicTypes link action
    angular
        .module('app.defaultClientModules', [])
        .controller('Default', Default) // exposes app model to the interface, loads data if necessary
    ;

    /** @ngInject */
    function Default( // this implements custom page linked to datatables rows vial link action
        $state,
        CONSTANTS,
        INTERFACE,
        $http,
        $location // ideally I'd like to use $routeParams, but angular-route.js doesn't seem to be loaded
    ) {
        var vm = this;
        vm.data = $state.current.data;
        vm.loading = false;
        vm.CONSTANTS = CONSTANTS;
        vm.INTERFACE = INTERFACE;

        var pathParts = $location.$$path.split('/');
        if(pathParts[2]) {
            var id = pathParts[2];
            vm.data.id = id;
            vm.loading = true;
            getPageData().then(onSuccess);
        }

        function getPageData() {
            var params = {
                method: vm.data.parameters.dataLinkMethod,
                url: CONSTANTS.apiUrl + vm.data.parameters.dataLink.replace(/:id/g, id)
            };
            return $http(params);
        }

        function onSuccess(response) {
            vm.loading = false;
            vm.data = _.merge(vm.data, response.data);
        }

    }

})();