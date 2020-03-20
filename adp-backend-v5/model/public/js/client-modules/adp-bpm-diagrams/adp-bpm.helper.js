(function() {
  angular.module('app.adpBpmDiagrams').factory('AdpBpmHelper', AdpBpmHelperFactory);

  /** @ngInject */
  function AdpBpmHelperFactory(
    GraphqlCollectionQuery,
    GraphqlCollectionMutator,
    AdpNotificationService,
    ErrorHelpers,
    AdpDmnHelper,
    AdpBpmnHelper
  ) {
    var supported = {
      bpmn: AdpBpmnHelper,
      dmn: AdpDmnHelper,
    };
    var FALLBACK_TYPE = 'bpmn';

    function getDiagramConfig(type) {
      return supported[type] || supported[FALLBACK_TYPE];
    }

    function isLibLoaded(type) {
      return getDiagramConfig(type).isLibLoaded ? getDiagramConfig(type).isLibLoaded() : '';
    }

    function getOnDiagramOpen(type, vm) {
      var config = getDiagramConfig(type);

      return (config.getOnDiagramOpen || function() {})(vm);
    }

    function getDiagram(type, record) {
      var config = getDiagramConfig(type);

      return config.getDiagram(record);
    }

    function loadRulesRecord(type, id) {
      var config = getDiagramConfig(type);
      var params = {
        filter: [['_id', '=', id]],
      };

      return GraphqlCollectionQuery(config.getSchema(), params)
        .then(function(result) {
          return result.items;
        })
        .catch(function(error) {
          ErrorHelpers.handleError(error, 'Unknown error while loading rules record');
          throw error;
        });
    }

    function putRulesRecord(type, vm, definition) {
      var config = getDiagramConfig(type);

      return config
        .getRecordToSave(vm, definition)
        .then(function(record) {
          return GraphqlCollectionMutator.update(config.getSchema(), record);
        })
        .then(function() {
          AdpNotificationService.notifySuccess('Ruleset is successfully stored into database');
        })
        .catch(function(error) {
          ErrorHelpers.handleError(error, 'Unknown error while saving DEFINITION');
        });
    }

    function getFileName(type, id) {
      var config = getDiagramConfig(type);

      return config.filePrefix + id + new Date().getTime() + '.' + type;
    }

    return {
      getDiagramConfig: getDiagramConfig,
      isLibLoaded: isLibLoaded,
      getOnDiagramOpen: getOnDiagramOpen,
      getDiagram: getDiagram,
      loadRulesRecord: loadRulesRecord,
      putRulesRecord: putRulesRecord,
      getFileName: getFileName,
    };
  }
})();
