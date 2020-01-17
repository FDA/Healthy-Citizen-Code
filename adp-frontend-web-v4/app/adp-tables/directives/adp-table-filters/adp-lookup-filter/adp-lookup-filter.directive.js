;(function () {
  'use strict';
  
  angular
    .module('app.adpTables')
    .directive('adpLookupFilter', adpLookupFilter);
  
  function adpLookupFilter(
    AdpTablesSearchService,
    APP_CONFIG,
    $timeout
  ) {
    return {
      restrict: 'E',
      templateUrl: 'app/adp-tables/directives/adp-table-filters/adp-lookup-filter/adp-lookup-filter.html',
      link: function (scope, element) {
        function init() {
          scope.field = scope.head.field;
          scope.filteredValue = [];

          scope.subjects = scope.field.lookup.table;
          scope.subjectNames = _.keys(scope.field.lookup.table);
          scope.subjectId = scope.field.lookup.id;
          scope.selectedSubject = { selected: scope.subjectNames[0] };

          _setOptions();
          _setDataFromUrl();
        }
        init();

        function _setOptions() {
          scope.options = {
            multiple: true,
            nextSearchTerm: function (selected) {
              if (selected && selected.length) {
                return selected.label;
              }

              return '';
            },
            formatResult: _label,
            formatSelection: _label,
            onChange: _search,
            ajax: _getRequestOptions(),
            formatAjaxError: 'Choose subject first',
            initSelection: _initData
          }
        }

        function _search(e) {
          var notChanged = e && !(e.added || e.removed);

          if (notChanged) {
            return;
          }

          var values = scope.filteredValue;

          var columnIndex = $(element).closest('th').index();
          var regexParts = _.map(values, function (id) {
            return AdpTablesSearchService.escapeRegexChars(id);
          });

          var searchParams = {
            columnIndex: columnIndex,
            searchString: regexParts.join('|'),
            isRegex: true
          };

          _setDataToUrl();

          // wait for dt to render, than emit event
          $timeout(function () {
            scope.$emit('filterChanged', searchParams);
          });
        }

        function _setDataToUrl() {
          scope.head.data = scope.filteredValue;
        }

        function _setDataFromUrl() {
          if (_.isNil(scope.head.data)) {
            return;
          }

          scope.filteredValue = scope.head.data;
          _search();
        }

        function _label(state) {
          return state.label;
        }

        function _initData(el, cb) {
          if (_.isEmpty(scope.filteredValue)) {
            return;
          }

          var data = _.map(scope.filteredValue, function (id) {
            return {
              label: id,
              id: id,
              _id: id
            }
          });

          cb(data);
        }

        function _getRequestOptions() {
          return {
            url: function getLookupEndpoint() {
              var tableName, endpoint;
              if (!scope.selectedSubject.selected) return;

              tableName = scope.subjects[scope.selectedSubject.selected].table;
              endpoint = APP_CONFIG.apiUrl + '/' +  ['lookups', scope.subjectId, tableName].join('/');

              return endpoint;
            },
            dataType: 'json',
            quietMillis: 300,
            data: function (term, page) {
              return { q: term, page: page };
            },
            results: function (response) {
              return {
                results: response.data.map(function (item) {
                  item.id = item._id;
                  return item;
                }),
                more: response.more
              };
            },
            cache: true
          }
        }
      }
    }
  }
})();
