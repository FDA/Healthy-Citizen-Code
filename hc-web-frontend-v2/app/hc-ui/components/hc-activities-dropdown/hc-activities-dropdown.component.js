;(function () {
  'use strict';

  var componentDefinition = {
    templateUrl: 'app/hc-ui/components/hc-activities-dropdown/hc-activities-dropdown.template.html',
    bindings: {
      projects: '<'
    },
    controllerAs: 'vm',
    controller: Controller
  };

  function Controller(ActivityMockService){
    var vm = this;

    vm.activeTab = 'default';
    vm.currentActivityItems = [];

    // MOCKS
    ActivityMockService.get()
      .then(function (response) {
        vm.activities = response.data.activities;
      });

    vm.isActive = function(tab){
      return vm.activeTab === tab;
    };

    vm.setTab = function(activityType){
      vm.activeTab = activityType;

      ActivityMockService.getByType(activityType)
        .then(function (response) {
          vm.currentActivityItems = response.data.data;
        });
    };
  }


  angular.module('app.hcUi')
    .component('hcActivitiesDropdown', componentDefinition);
})();