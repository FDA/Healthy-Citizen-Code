(function ()
{
    'use strict';

    angular
        .module('app.core')
        .filter('booleanFilter', booleanFilter);

    /** @ngInject */
    function booleanFilter()
    {
        return function (value)
        {
            return value ? 'enabled' : 'disabled';
        };
    }

})();
