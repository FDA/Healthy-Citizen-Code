;(function() {
  'use strict';

  angular
    .module('app.adpGenerator')
    .factory('MultiRecordPageService', MultiRecordPageService);

  /** @ngInject */
  function MultiRecordPageService(
    GraphqlCollectionQuery,
    ActionsHandlers,
    AdpQueryParams,
    ResponseError,
    ACTIONS,
    $q
  ) {
    return function (schema, queryData) {
      if (!actionPermitted(schema, queryData.action)) {
        return;
      }

      callAction(schema, queryData);
    }

    function actionPermitted(schema, actionName) {
      var pageActions = [
        ACTIONS.VIEW_DETAILS, ACTIONS.UPDATE, ACTIONS.CREATE, ACTIONS.CLONE, ACTIONS.DELETE
      ];

      if (!pageActions.includes(actionName)) {
        return false;
      }

      var permittedActions = schema.actions.fields || {};
      return !!permittedActions[actionName];
    }

    function callAction(schema, queryData) {
      var promise = !!queryData._id ? getRecordById : $q.when;

      promise(queryData._id, schema)
        .then(function (record) {
          callActionByName(schema, queryData, record);
        });
    }

    function getRecordById(id, schema) {
      return GraphqlCollectionQuery(schema, { filter: ['_id', '=', id] })
        .then(function (data) {
          if (_.isNull(data)) {
            throw new ResponseError(ResponseError.RECORD_NOT_FOUND);
          }
          return data.items[0];
        })
        .catch(function (error) {
          ErrorHelpers.handleError(error, 'Unknown error trying to data for query params');
        });
    }

    function callActionByName(schema, queryData, record) {
      if (queryData.action === ACTIONS.VIEW_DETAILS) {
        ActionsHandlers.viewDetails(schema, record);
      } else {
        callActionForForm(schema, queryData, record);
      }
    }

    function callActionForForm(schema, queryData, record) {
      var dataFromQuery = AdpQueryParams.getDataFromQueryParams(schema, queryData);
      var record = record || {};
      var formData = _.merge({}, record, dataFromQuery);

      ActionsHandlers[queryData.action](schema, formData);
    }
  }
})();
