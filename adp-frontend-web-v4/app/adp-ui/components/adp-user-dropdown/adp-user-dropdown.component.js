;(function () {
  'use strict';

  var componentDefinition = {
    templateUrl: 'app/adp-ui/components/adp-user-dropdown/adp-user-dropdown.template.html',
    controller: 'adpUserDropdownController',
    controllerAs: 'vm'
  };

  angular.module('app.adpUi')
    .component('adpUserDropdown', componentDefinition);
})();