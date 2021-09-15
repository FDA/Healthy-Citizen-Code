(function() {
  angular.module('app.adpBpmDiagrams').factory('AdpDmnConfig', AdpDmnConfigFactory);

  /** @ngInject */
  function AdpDmnConfigFactory(APP_CONFIG) {
    var resourceUrl = APP_CONFIG.resourceUrl + '/public/js/lib/dmn-js';
    return {
      diagramFieldName: 'definition',
      nativeName: 'DMN Rules',
      jsUrl: resourceUrl + '/index.js',
      cssUrl: resourceUrl + '/css/style.css',
      libName: 'DmnJS',
      collectionName: 'businessRules',
      emptyDiagram: [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<definitions xmlns="http://www.omg.org/spec/DMN/20151101/dmn.xsd" id="id" name="Name" namespace="http://camunda.org/schema/1.0/dmn" >',
        '<decision id="Decision_1ipw720" name="Start here!">',
        '<extensionElements>',
        '<biodi:bounds x="322" y="163" width="180" height="80" />',
        '</extensionElements>',
        '</decision>',
        '</definitions>',
      ].join('\n'),
    };
  }
})();
