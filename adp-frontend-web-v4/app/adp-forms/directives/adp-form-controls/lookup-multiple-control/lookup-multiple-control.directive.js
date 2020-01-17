(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('lookupMultipleControl', lookupMultipleControl);

  function lookupMultipleControl(
    AdpLookupHelpers,
    AdpValidationService,
    AdpFieldsService,
    $timeout
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/lookup-multiple-control/lookup-multiple-control.html',
      require: '^^form',
      link: function (scope, element) {
        // WORKAROUND: this whole file is workaround for select2 v3
        // 1. modelCache is model cache to avoid, because select2 writes incorrect data on change
        // 2. check the scope.options.onChange callback: That where modelCache is changed
        // 3. check scope.change: that's where we copy modelCache to our real date, when is added or remove
        // 4. the logic here is that we want to change real data only after select2 proccesses all it's actions.
        //    And guess what? We are using setTimeout. That's how we want avoid any error that would select2 fire.
        var modelCache;

        scope.subjects = scope.field.lookup.table;
        scope.subjectNames = _.keys(scope.field.lookup.table);
        scope.subjectId = scope.field.lookup.id;

        scope.isRequired = AdpValidationService.isRequired(scope.validationParams.formParams);

        scope.isEmpty = function () {
          var data = scope.getData();
          return _.isUndefined(data) || _.isNull(data) || _.isEmpty(data);
        };

        // return ref object for form field value
        scope.getData = function getData() {
          return scope.adpFormData[scope.field.keyName];
        };

        scope.setData = function (value) {
          return scope.adpFormData[scope.field.keyName] = value;
        };

        function fromCacheToData() {
          var dataRef = scope.getData();

          // we need to keep ref to object, we can't delete it
          dataRef.length = 0;
          // $(this).select2('val', dataRef);
          modelCache.forEach(function (item, index) {
            dataRef[index] = modelCache[index];
          });
        }

        // contains table name
        scope.selectedSubject = {};

        if (scope.isEmpty()) {
          modelCache = [];
          scope.setData(_.clone(modelCache));
        } else {
          modelCache = _.clone(scope.getData());
        }

        scope.selectedSubject.selected = scope.subjectNames.length === 1
          ? scope.subjectNames[0] : '';

        function formatLabel(state) {
          var lookup = {
            _id: state.id,
            table: state.table || scope.selectedSubject.selected,
            label: state.label,
            data: state.data
          };

          var params = {
            lookup: lookup,
            fieldData: scope.getData(),
            formData: scope.adpFormData,
            fieldSchema: scope.field
          };

          return AdpLookupHelpers.getLabelRenderer(params);
        }


        scope.options = {
          multiple: true,
          nextSearchTerm: function (selected) {
            if (selected && selected.length) {
              return selected.label;
            }

            return '';
          },
          formatResult: formatLabel,
          formatSelection: formatLabel,
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
            fromCacheToData();
          },
          ajax: {
            dataType: 'json',
            quietMillis: 300,
            transport: function (args) {
              var params = _.clone(args);
              _.assign(params, {
                url: AdpLookupHelpers.endpoint(scope),
                contentType: 'application/json'
              });

              return $.ajax(params);
            },
            params: function() {
              return {
                type: AdpLookupHelpers.hasCondition(scope) ? 'POST' : 'GET',
                method: AdpLookupHelpers.hasCondition(scope) ? 'POST' : 'GET'
              };
            },
            data: function (term, page) {
              if (AdpLookupHelpers.hasCondition(scope)) {
                return JSON.stringify(scope.adpFormData);
              } else {
                return { q: term, page: page };
              }
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
          },
          formatAjaxError: 'Choose subject first',
          initSelection: function (element, callback) {
            var data;
            if (scope.isEmpty()) return;

            data = scope.getData().map(function (lookupObject) {
              return {
                id: lookupObject._id,
                label: lookupObject.label,
                table: lookupObject.table,
                data: lookupObject.data
              }
            });

            callback(data);
          }
        };

        // HACK
        $timeout(function () {
          $timeout(function () {
            var input = element[0].querySelector('.select2-input');
            input.autocomplete = AdpFieldsService.autocompleteValue(scope.field);
          });
        });
      }
    }
  }
})();
