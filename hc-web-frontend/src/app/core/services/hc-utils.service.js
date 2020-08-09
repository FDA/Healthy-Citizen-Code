(function() {
    'use strict';

    angular
        .module('app.core')
        .service('hcUtilsService', hcUtilsService)

    function hcUtilsService($state, $stateParams, hcFlashService) {
        var service = {
            changeTab: changeTab,
            removeFields: removeFields
        };

        return service

        /**
         * changeTab
         * 
         * @param  {string} tab
         * @param  {string} flashMessage
         * @param  {string} flashType
         * @return {type}
         */
        function changeTab (tab, flashMessage, flashType) {
            $state.go($state.current, {tab: tab}, {reload: true})
                .then(function () {
                    hcFlashService.success(flashMessage)
                })
        };

        /**
         * removeFields - Removing
         *
         * @param  {object} target
         * @param  {array}  fields
         */
        function removeFields (target, fields) {
            _.forEach(fields, function (field) {
                _.unset(target, field)
            })
        }
    }
})();
