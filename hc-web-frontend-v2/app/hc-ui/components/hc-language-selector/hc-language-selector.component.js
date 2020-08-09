;(function () {
  'use strict';

  var componentDefinition = {
    templateUrl: 'app/hc-ui/components/hc-language-selector/hc-language-selector.template.html',
    controllerAs: 'vm',
    controller: Controller
  };

  /** @ngInject */
  function Controller($rootScope, HcLanguageMockService){
    var vm = this;

    // TODO: don't use it, please. Rewrite with ng-translate
    $rootScope.lang = {};

    HcLanguageMockService.getAll()
      .then(function(response){
        $rootScope.currentLanguage = response.data[0];
        $rootScope.languages = response.data;

        return HcLanguageMockService.getByType($rootScope.currentLanguage.key);
      })
      .then(function (response) {
        $rootScope.lang = response.data;
      });

    vm.selectLanguage = function(language){
      $rootScope.currentLanguage = language;

      HcLanguageMockService.getByType(language.key)
        .then(function (response) {
          $rootScope.lang = response.data;
        });
    };

    $rootScope.getWord = function(key){
      if(angular.isDefined($rootScope.lang[key])){
        return $rootScope.lang[key];
      }
      else {
        return key;
      }
    }
  }


  angular.module('app.hcUi')
    .component('hcLanguageSelector', componentDefinition);
})();