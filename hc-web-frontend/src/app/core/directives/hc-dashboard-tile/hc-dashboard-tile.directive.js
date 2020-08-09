(function () {
    'use strict';

    angular
        .module('app.core')
        .directive('hcDashboardTile', hcDashboardTile);

    /** @ngInject */
    function hcDashboardTile($compile, hcTemplateEngine) {
        return {
            restrict: 'E',
            scope: {
                item: '=',
                data: '='
            },
            transclude: true,
            link: function (scope, element) {
                // if (!scope.data) return false;
                scope.$watch('data', function(newVal) {
                    if(newVal) {
                        var parsedTemplate = hcTemplateEngine.parseTemplate(scope.item.template, scope.item.color, scope.data);

                        element.html(parsedTemplate);
                        $compile(element.contents())(scope);        
                    }
                }, true);
                
            }
        };
    }
})();
