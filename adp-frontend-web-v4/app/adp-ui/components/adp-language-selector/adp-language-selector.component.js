;(function () {
  'use strict';

  var componentDefinition = {
    templateUrl: 'app/adp-ui/components/adp-language-selector/adp-language-selector.template.html',
    controllerAs: 'vm',
    controller: Controller
  };

  /** @ngInject */
  function Controller($rootScope, AdpLanguageMockService){
    var vm = this;

    // TODO: don't use it, please. Rewrite with ng-translate
    $rootScope.lang = {};

    AdpLanguageMockService.getAll()
      .then(function(response){
        $rootScope.currentLanguage = response.data[0];
        $rootScope.languages = response.data;

        return AdpLanguageMockService.getByType($rootScope.currentLanguage.key);
      })
      .then(function (response) {
        $rootScope.lang = response.data;
      });

    vm.selectLanguage = function(language){
      $rootScope.currentLanguage = language;

      AdpLanguageMockService.getByType(language.key)
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


  angular.module('app.adpUi')
    .component('adpLanguageSelector', componentDefinition);
})();