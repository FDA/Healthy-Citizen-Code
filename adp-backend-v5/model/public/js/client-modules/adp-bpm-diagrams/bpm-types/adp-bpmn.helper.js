(function() {
  angular.module('app.adpBpmDiagrams').factory('AdpBpmnHelper', AdpBpmnHelperFactory);

  /** @ngInject */
  function AdpBpmnHelperFactory(AdpSchemaService, AdpBpmnConfig) {
    function getDiagram(record) {
      return record[AdpBpmnConfig.diagramFieldName] || AdpBpmnConfig.emptyDiagram;
    }

    function getRecordToSave(vm, definition) {
      vm.record[AdpBpmnConfig.diagramFieldName] = definition;

      return new $.Deferred().resolve(vm.record);
    }

    function getSchema() {
      return AdpSchemaService.getSchemaByName(AdpBpmnConfig.collectionName);
    }

    return {
      nativeName: AdpBpmnConfig.nativeName,
      jsUrl: AdpBpmnConfig.jsUrl,
      cssUrl: AdpBpmnConfig.cssUrl,
      filePrefix: 'process_',
      getInstance: function(options) {
        return new window[AdpBpmnConfig.libName](options);
      },
      isLibLoaded: function() {
        return !!window[AdpBpmnConfig.libName];
      },
      getRecordToSave: getRecordToSave,
      getDiagram: getDiagram,
      getSchema: getSchema,
    };
  }
})();
