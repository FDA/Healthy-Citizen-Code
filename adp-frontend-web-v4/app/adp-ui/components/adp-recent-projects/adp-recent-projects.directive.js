;(function () {
  'use strict';

  var componentDefinition = {
    bindings: {
      projects: '<'
    },
    controllerAs: 'vm',
    templateUrl: 'app/adp-ui/components/adp-recent-projects/adp-recent-projects.template.html',
    controller: Controller
  };

  /** @ngInject */
  function Controller(AdpProjectMockService) {
    var vm = this;

    // MOCKS
    AdpProjectMockService.list()
      .then(function(response){
        vm.projects = response.data;
      });

    vm.clearProjects = function() {
      vm.projects = [];
    }
  }


  angular.module('app.adpUi')
    .component('adpRecentProjects', componentDefinition);
})();

