(function() {
    'use strict';

    angular
        .module('app.core')
        .directive('hcNestedTable', hcNestedTableDirective);

    /** @ngInject */
    function hcNestedTableDirective($document, $compile, RecursionHelper) {
        return {
            restrict: 'E',
            scope: {
                data: '='
            },
            transclude: true,
            templateUrl: 'app/core/directives/hc-nested-table/hc-nested-table.html',
            compile: function(element) {
                return RecursionHelper.compile(element, function(scope, iElement, iAttrs, controller, transcludeFn) {
                    // Define your normal link function here.
                    // Alternative: instead of passing a function,
                    // you can also pass an object with
                    // a 'pre'- and 'post'-link function.

                    scope.array = _.isArray(scope.data);
                    scope.isArray = function (arr) {
                        return _.isArray(arr);
                    }

                    scope.isObject = function (obj) {
                        return (typeof obj == 'object');
                    }

                    scope.getDataSize = function (val) {
                        return _.size(val);
                    };

                    scope.hasObjects = function (arr) {
                        return (typeof arr[0] == 'object');
                    };

                    scope.isDate = function (val) {
                        
                        return false;
                        // return !!Date.parse(val);
                    }

                });
            }
        };
    }
})();
