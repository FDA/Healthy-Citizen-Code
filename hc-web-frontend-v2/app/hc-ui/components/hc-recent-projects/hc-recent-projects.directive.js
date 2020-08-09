;(function () {
  'use strict';

  var componentDefinition = {
    bindings: {
      projects: '<'
    },
    controllerAs: 'vm',
    templateUrl: 'app/hc-ui/components/hc-recent-projects/hc-recent-projects.template.html',
    controller: Controller
  };

  /** @ngInject */
  function Controller(HcProjectMockService) {
    var vm = this;

    // MOCKS
    HcProjectMockService.list()
      .then(function(response){
        vm.projects = response.data;
      });

    vm.clearProjects = function() {
      vm.projects = [];
    }
  }


  angular.module('app.hcUi')
    .component('hcRecentProjects', componentDefinition);
})();

