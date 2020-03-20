(function() {
  angular.module('app.adpBpmDiagrams').factory('AdpDmnHelper', AdpDmnHelperFactory);

  /** @ngInject */
  function AdpDmnHelperFactory(AdpModalService, AdpSchemaService, AdpDecisionMenuHelper, AdpDmnConfig, APP_CONFIG) {
    function getOnDiagramOpen(vm) {
      return function() {
        var selectedId =
          vm.record[AdpDmnConfig.diagramFieldName] && vm.record[AdpDmnConfig.diagramFieldName].decisionId;
        vm.decisionMenu = AdpDecisionMenuHelper($('#decision-menu'), vm.instance, selectedId);
      };
    }

    function getDiagram(record) {
      return (
        (record[AdpDmnConfig.diagramFieldName] && record[AdpDmnConfig.diagramFieldName].dmnXml) ||
        AdpDmnConfig.emptyDiagram
      );
    }

    function getSchema() {
      return AdpSchemaService.getSchemaByName(AdpDmnConfig.collectionName);
    }

    function getRecordToSave(vm, definition) {
      var doPrepare = function(nodeId) {
        vm.record[AdpDmnConfig.diagramFieldName] = { decisionId: nodeId, dmnXml: definition };
        return vm.record;
      };
      var deferred = new $.Deferred();

      vm.decisionMenu && vm.decisionMenu.doRefresh();

      if (vm.decisionMenu && vm.decisionMenu.selected && vm.decisionMenu.selected.id) {
        deferred.resolve(doPrepare(vm.decisionMenu.selected.id));
      } else {
        AdpModalService.confirm({ message: 'Are you sure to save diagram without run decision?' })
          .then(function() {
            deferred.resolve(doPrepare());
          })
          .catch(deferred.reject);
      }

      return deferred.promise();
    }

    return {
      nativeName: AdpDmnConfig.nativeName,
      jsUrl: AdpDmnConfig.jsUrl,
      cssUrl: AdpDmnConfig.cssUrl,
      filePrefix: 'ruleset_',
      getInstance: function(options) {
        return new window[AdpDmnConfig.libName](options);
      },
      isLibLoaded: function() {
        return !!window[AdpDmnConfig.libName];
      },
      getOnDiagramOpen: getOnDiagramOpen,
      getRecordToSave: getRecordToSave,
      getDiagram: getDiagram,
      getSchema: getSchema,
    };
  }
})();
