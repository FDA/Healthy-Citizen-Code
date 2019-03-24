;(function () {
  'use strict';

  var componentDefinition = {
    templateUrl: 'app/adp-ui/components/adp-page-description/adp-page-description.template.html',
    bindings: {
      schema: '<'
    },
    controller: Controller
  };

  /** @ngInject */
  function Controller($sce, APP_CONFIG, $rootScope) {
    var vm = this;
    vm.isEmpty = true;

    vm.$onInit = function () {
      var converter = new showdown.Converter();

      vm.isEmpty = !vm.schema.description;

      if (vm.isEmpty) {
        return;
      }

      var html = _.template(vm.schema.description)({
        APP_CONFIG: APP_CONFIG,
        REQUEST: $rootScope.lastApiRequest || {}
      });
      var md = converter.makeHtml(html);

      vm.description = $sce.trustAsHtml(md);
    }
  }

  angular.module('app.adpUi')
    .component('adpPageDescription', componentDefinition);
})();
