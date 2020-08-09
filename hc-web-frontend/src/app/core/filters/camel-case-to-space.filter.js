(function ()
{
    'use strict';

    angular
        .module('app.core')
        .filter('camelCaseToSpace', camelCaseToSpace);

    /** @ngInject */
    function camelCaseToSpace()
    {
        return function (value) {
          if (!value) return value;
          return value.replace(/([A-Z])/g, ' $1')
          // uppercase the first character
          .replace(/^./, function(str){ return str.toUpperCase(); })

        };
    }

})();
