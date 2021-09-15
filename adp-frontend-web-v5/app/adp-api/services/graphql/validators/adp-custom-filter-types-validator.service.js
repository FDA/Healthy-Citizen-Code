;(function () {
  "use strict";

  angular
    .module("app.adpApi")
    .factory("CustomFilterTypesValidatorService", CustomFilterTypesValidatorService);

  /** @ngInject */
  function CustomFilterTypesValidatorService(
    GraphqlRequest, AdpTime
  ) {
    var queryTypes = {
      "Mongo Expression": MongoExpression,
      "Relative Date": RelativeDate,
      "Database Field": DatabaseField,
    }
    var filterValidatorDebounced = _.debounce(filterValidator, 1000);
    var promiseCache = new CachedPromiseHelper();

    return function (modelName, filterType, filterValue, validationRule) {
      var callback = function (isValid, message) {
        validationRule.message = message;

        promiseCache.resolveAndRefresh(isValid);
      }

      filterValidatorDebounced(modelName, filterType, filterValue, callback);

      return promiseCache.getPromise();
    }

    function CachedPromiseHelper() {
      this.resolveAndRefresh = function (result) {
        var self = this;

        this.resolverFunction && this.resolverFunction(result);

        this.cachedPromise = new Promise(function (resolve) {
          self.resolverFunction = resolve;
        });
      }

      this.getPromise = function () {
        return this.cachedPromise;
      }

      this.resolverFunction = null;

      this.resolveAndRefresh();
    }

    function filterValidator(modelName, filterType, filterValue, cb) {
      var query = getQuery();
      var expressionGetter = getExpressionBuilder(filterType);
      var request;

      if (!expressionGetter) {
        cb(false, "Unsupported query type");
      } else {
        var variables = {expression: expressionGetter(filterValue), modelName: modelName};
        request = validationQuery(query, variables)
      }

      request.then(function (data) {
        cb(data.isValidFilter, data.errors);
      })
    }

    function validationQuery(query, variables) {
      return GraphqlRequest({
        name: "validateFilter",
        query: query,
        variables: variables,
      });
    }

    function getExpressionBuilder(filterType) {
      var queryGenerator = queryTypes[filterType];

      if (!queryGenerator) {
        return null;
      }

      return queryGenerator;
    }

    function getQuery() {
      return [
        "query",
        "q($expression:String!, $modelName:String!)",
        "{",
        "validateFilter(",
        "filter: {dxQuery: $expression},",
        "modelName: $modelName",
        ")",
        "{isValidFilter errors}",
        "}"
      ].join(" ");
    }

    function MongoExpression(filterValue) {
      return filterValue ? "{ type: 'Mongo Expression', expression: " + filterValue + "}" : "";
    }

    function RelativeDate(filterValue) {
      return "{type:'Relative Date', expression:{fieldPath:'" + filterValue[0]
        +"',operation:'" + filterValue[1] + "',value:'" + filterValue[2] + "',timezone:'" + AdpTime.guessTimeZone() + "'}}";

      //['date', '=', '2 day ago']
      //{ type: "Relative Date", expression: { fieldPath: "date", operation: "=", value: "1 day ago", timezone: "Europe/Moscow" } }
    }

    function DatabaseField(filterValue) {
      return "{ type: 'Database Field', expression: " + JSON.stringify(filterValue) + " }";
    }
  }
})();
