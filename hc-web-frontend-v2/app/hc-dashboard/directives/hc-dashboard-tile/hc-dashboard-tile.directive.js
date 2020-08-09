;(function () {
  'use strict';
  
  angular
    .module('app.hcDashboard')
    .directive('hcDashboardTile', hcDashboardTile);
  
  /** @ngInject */
  function hcDashboardTile(
    $state,
    hcTemplateEngineService,
    $compile,
    INTERFACE
  ) {
    return {
      restrict: 'E',
      scope: {
        item: '=',
        data: '='
      },
      replace: true,
      link: function (scope, element) {
        var actionsMap =  {
          'add': add,
          'view': view
        };

        function getTpl(template) {
          // FIXME: using inner HTML of template to avoid wrapping into <div class="dashboard">
          // FIXME: should be fixed inside of hcTemplateEngineService
          var tpl = hcTemplateEngineService.parseTemplate(
            template,
            scope.item.parameters.color,
            scope.item
          );

          return tpl.innerHTML;
        }

        function compile() {
          var tpl = INTERFACE.dashboardSubtypes.fields[scope.item.subtype].template;
          var html = getTpl(tpl);
          element.replaceWith($compile(html)(scope));
        }

        scope.action = function (actionType, item) {
          var destinationState = _linkToState(item.parameters.link);

          actionsMap[actionType](destinationState);
        };
        
        function add(destinationState) {
          $state.go(destinationState, {addRecord: true});
        }
        
        function view(destinationState) {
          $state.go(destinationState);
        }
        
        function _linkToState(link) {
          return 'app.' + _.last(link.split('/'));
        }

        compile();
      }
    };
  }
})();
