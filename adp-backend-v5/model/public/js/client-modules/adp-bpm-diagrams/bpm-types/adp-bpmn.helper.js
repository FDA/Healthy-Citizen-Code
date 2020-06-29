(function () {
  angular.module('app.adpBpmDiagrams').factory('AdpBpmnHelper', AdpBpmnHelperFactory);

  /** @ngInject */
  function AdpBpmnHelperFactory(
    AdpSchemaService,
    AdpBpmnConfig,
    GraphqlCollectionQuery,
    ServerError,
    ErrorHelpers,
    APP_CONFIG,
    $http
  ) {
    function getDiagram(record) {
      return (
        (record[AdpBpmnConfig.diagramFieldName] && record[AdpBpmnConfig.diagramFieldName].xml) ||
        AdpBpmnConfig.emptyDiagram
      );
    }

    function getRecordToSave(vm, definition) {
      vm.record[AdpBpmnConfig.diagramFieldName] = { xml: definition };

      return new $.Deferred().resolve(vm.record);
    }

    function getSchema() {
      return AdpSchemaService.getSchemaByName(AdpBpmnConfig.collectionName);
    }

    function getExtensions() {
      return {};
    }

    function getAdditionalData(record) {
      var businessRulesSchema = AdpSchemaService.getSchemaByName('businessRules');
      var businessRulesLoad = GraphqlCollectionQuery(businessRulesSchema, {})
        .then(function (result) {
          return result.items;
        })
        .catch(function (error) {
          ErrorHelpers.handleError(error, 'Unknown error while loading businessRules list');
          throw error;
        });
      var servicesLoad = $http
        .get(APP_CONFIG.apiUrl + '/getBpmnServicesScheme')
        .then(function (result) {
          if (result.data.success) {
            return result.data.data.services;
          } else {
            throw new ServerError(result.data.message);
          }
        })
        .catch(function (error) {
          ErrorHelpers.handleError(error, 'Error while loading services list');
          throw error;
        });

      return $.when.apply(this, [businessRulesLoad, servicesLoad]).then(function () {
        var results = arguments;

        return {
          businessRulesOptions: _.map(results[0], function (item) {
            return { value: item._id, name: item.name };
          }),
          serviceTaskSchemas: results[1],
        };
      });
    }

    return {
      nativeName: AdpBpmnConfig.nativeName,
      jsUrl: AdpBpmnConfig.jsUrl,
      cssUrl: AdpBpmnConfig.cssUrl,
      filePrefix: 'process_',
      getInstance: function (options) {
        return new window[AdpBpmnConfig.libName](Object.assign({}, getExtensions(), options));
      },
      isLibLoaded: function () {
        return !!window[AdpBpmnConfig.libName];
      },
      getRecordToSave: getRecordToSave,
      getDiagram: getDiagram,
      getSchema: getSchema,
      getAdditionalData: getAdditionalData,
    };
  }
})();
