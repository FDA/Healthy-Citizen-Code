;(function () {
  "use strict";

  angular
    .module('app.adpGenerator')
    .controller('DatasetController', DatasetController);

  /** @ngInject */
  function DatasetController(
    GraphqlCollectionQuery,
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
      var datasetsSchema = AdpSchemaService.getSchemaByName('datasets');

      getRecordById($stateParams._id, datasetsSchema)
        .then(function (data) {
          vm.success = true;
          vm.schema = _.cloneDeep(data.scheme);
          vm.schema.schemaName = '_ds_' + $stateParams._id;
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
        })
    })();

    function getRecordById(id, schema) {
      vm.loaded = false;

      return GraphqlCollectionQuery(schema, { filter: ['_id', '=', id] })
        .then(function (data) {
          if (_.isNil(data)) {
            throw new ResponseError(ResponseError.RECORD_NOT_FOUND);
          }

          var schemeEmpty = _.get(data, 'items[0].scheme', null) === null;
          if (schemeEmpty) {
            throw new ResponseError(ResponseError.SCHEMA_IS_EMPTY);
          }

          return data.items[0];
        });
    }
  }
})();
