;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('AdpLookupHelpers', AdpLookupHelpers);

  function AdpLookupHelpers(APP_CONFIG) {
    function getLookupEndpoint(scope) {
      var tableName, endpoint;
      if (!scope.selectedSubject.selected) return;

      tableName = scope.subjects[scope.selectedSubject.selected].table;
      endpoint = APP_CONFIG.apiUrl + '/' +  ['lookups', scope.subjectId, tableName].join('/');

      return endpoint;
    }

    function hasCondition(scope) {
      var result = false;

      _.each(scope.subjects, function (table) {
        result = !!table.where;
      });

      return result;
    }

    return {
      endpoint: getLookupEndpoint,
      hasCondition: hasCondition
    }
  }
})();
