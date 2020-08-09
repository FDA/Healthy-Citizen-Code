(function ()
{
    'use strict';

    angular
        .module('app.core')
        .directive('hcUserBlockDirective', hcUserBlockDirective);

    /** @ngInject */
    function hcUserBlockDirective($document, $compile)
    {
        return {
            restrict   : 'E',
            scope      : {
              data: '='
            },
            transclude : true,
            templateUrl: 'app/core/directives/hc-user-block/hc-user-block.html',
            link       : function (scope, iElement)
            {

            }
        };
    }
})();
