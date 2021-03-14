(function () {
  "use strict";

  angular
    .module("app.adpGenerator")
    .controller("DatasetController", DatasetController);

  /** @ngInject */
  function DatasetController(
    GraphqlRequest,
    GraphqlCollectionFields,
    MultiRecordPageService,
    AdpSchemaService,
    ResponseError,
    $location,
    $stateParams
  ) {
    var vm = this;
    vm.schema = null;
    vm.loaded = false;
    vm.success = false;

    (function init() {
      getDatasetSchema($stateParams._id)
        .then(function (schema) {
          vm.success = true;
          vm.schema = _.cloneDeep(schema);
          vm.schema.schemaName = "_ds_" + $stateParams._id;
          MultiRecordPageService(vm.schema, $location.search());
        })
        .catch(function (error) {
          if (error instanceof ResponseError) {
            vm.errorMessage = error.message;
          } else {
            vm.errorMessage = ResponseError.RECORD_NOT_FOUND;
          }
          vm.success = false;
          console.error(error);
        })
        .finally(function () {
          vm.loaded = true;
        });
    })();

    function getDatasetSchema(id) {
      vm.loaded = false;

      return GraphqlRequest({
        name: "getSingleDataset",
        query: [
          "query q($id: MongoId) {",
            "getSingleDataset(filter: { _id: $id }) {",
              "scheme",
            "}",
          "}",
        ].join("\n"),
        variables: { id: id },
      }).then(function (data) {
        if (_.isNil(data)) {
          throw new ResponseError(ResponseError.RECORD_NOT_FOUND);
        }

        var scheme = _.get(data, "scheme", null);
        if (scheme  === null) {
          throw new ResponseError(ResponseError.SCHEMA_IS_EMPTY);
        }

        return scheme;
      });
    }

    function GraphqlSingleDatasetQuery(
      GraphqlCollectionQueryBuilder,
      GraphqlCollectionQueryVariables,
      GraphqlRequest,
      GraphqlHelper
    ) {
      return function (schema, params) {
        var params = params || {};
        var queryName = GraphqlHelper.collectionQueryName(schema, params);

        return GraphqlRequest({
          name: getSingleDataset,
          query: GraphqlCollectionQueryBuilder(queryName, schema, params),
          variables: GraphqlCollectionQueryVariables(schema, params),
        });
      };
    }
  }
})();
