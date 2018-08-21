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
      scope: {
        schema: '='
      },
      templateUrl: 'app/adp-tables/directives/adp-table-filters/adp-lookup-filter/adp-lookup-filter.html',
      link: function (scope, element) {
        scope.field = scope.schema;
        // WORKAROUND: this whole file is workaround for select2 v3
        // 1. modelCache is model cache to avoid, because select2 writes incorrect data on change
        // 2. check the scope.options.onChange callback: That where modelCache is changed
        // 3. check scope.change: that's where we copy modelCache to our real date, when is added or remove
        // 4. the logic here is that we want to change real data only after select2 proccesses all it's actions.
        //    And guess what? We are using setTimeout. That's how we want avoid any error that would select2 fire.
        var modelCache = [];
        scope.filteredValue = [];

        scope.subjects = scope.field.lookup.table;
        scope.subjectNames = _.keys(scope.field.lookup.table);
        scope.subjectId = scope.field.lookup.id;

        scope.isMultiple = scope.field.type === 'LookupObjectID[]';
        scope.selectedSubject = { selected: scope.subjectNames[0] };


        scope.isEmpty = isEmpty;
        function isEmpty() {
          var data = getData();
          return _.isEmpty(data);
        }

        // return ref object for form field value
        function getData() {
          return scope.filteredValue;
        }

        function search(values) {
          var columnIndex = $(element).closest('th').index();
          var regexParts = $.map(values, function (value) {
            return AdpTablesSearchService.escapeRegexChars(value.label.trim());
          });

          var searchParams = {
            columnIndex: columnIndex,
            searchString: regexParts.join('|'),
            isRegex: true
          };

          scope.$emit('filterChanged', searchParams);
        }

        scope.change = function() {
          var dataRef = getData();

          $timeout(function () {
            // we need to keep ref to object, we can't delete it
            dataRef.length = 0;
            // $(this).select2('val', dataRef);
            modelCache.forEach(function (item, index) {
              dataRef[index] = modelCache[index];
            });

            search(scope.filteredValue);
          });
        };

        scope.options = {
          multiple: true,
          nextSearchTerm: function (selected) {
            if (selected && selected.length) {
              return selected.label;
            }

            return '';
          },
          formatResult: function(state) {
            return state.label;
          },
          formatSelection: function(state) {
            // TODO: add check for multiple
            var prefix = (state.table || scope.selectedSubject.selected) + ' | ';
            var label = state.label;

            if (scope.isMultiple) {
              label = prefix + label;
            }

            return  label;
          },
          onChange: function(e) {
            var newValue;

            if (e.added) {
              newValue = e.added;

              newValue.table = scope.selectedSubject.selected;
              newValue._id = newValue.id;
              modelCache.push(newValue);
            }

            if (e.removed) {
              // first delete, than copy
              _.remove(modelCache, function (item) {
                return (item._id || item.id) === e.removed.id;
              });
            }

            scope.$apply();
          },
          ajax: {
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
              return { results: response.data, more: response.more };
            },
            cache: true
          },
          formatAjaxError: 'Choose subject first',
          initSelection: function (element, callback) {
            var data;
            if (scope.isEmpty()) return;

            data = getData().map(function (lookupObject) {
              return {
                id: lookupObject._id,
                label: lookupObject.label,
                table: lookupObject.table
              }
            });

            callback(data);
          }
        };
      }
    }
  }
})();
