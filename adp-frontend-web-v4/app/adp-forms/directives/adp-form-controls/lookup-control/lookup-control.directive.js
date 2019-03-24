(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('lookupControl', lookupControl);

  function lookupControl(
    AdpLookupHelpers,
    AdpValidationService,
    AdpFieldsService
  ) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/lookup-control/lookup-control.html',
      require: '^^form',
      link: function (scope) {
        scope.subjects = scope.field.lookup.table;
        scope.subjectNames = _.keys(scope.field.lookup.table);
        scope.subjectId = scope.field.lookup.id;

        scope.isRequired = AdpValidationService.isRequired(scope.validationParams);
        scope.isEmpty = function() {
          var data = scope.getData();
          return _.isUndefined(data) || _.isNull(data) || _.isEmpty(data);
        };

        scope.getData = function getData() {
          return scope.adpFormData[scope.field.keyName];
        };

        scope.setData = function (value) {
          return scope.adpFormData[scope.field.keyName] = value;
        };

        // contains table name
        scope.selectedSubject = {};

        if (scope.isEmpty()) {
          scope.setData(null);
          scope.selectedSubject.selected = scope.subjectNames.length === 1 ? scope.subjectNames[0] : '';
        } else {
          scope.selectedSubject.selected = scope.getData().table;
        }

        function formatLabel(state) {
          var lookup = {
            _id: state.id,
            table: scope.selectedSubject.selected,
            label: state.label
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
          // allowClear: true,
          placeholder: '-',
          nextSearchTerm: function (selected) {
            if (selected && selected.label) {
              return selected.label;
            }

            return '';
          },
          formatResult: formatLabel,
          formatSelection: formatLabel,
          ajax: {
            transport: function (args) {
              var params = _.clone(args);
              _.assign(params, {
                url: AdpLookupHelpers.endpoint(scope),
                contentType: 'application/json'
              });

              return $.ajax(params);
            },
            dataType: 'json',
            quietMillis: 300,
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
              return { results: response.data, more: response.more };
            },
            cache: true
          },
          onOpen: function(e) {
            // HACK assuming that last select2 input is our target
            var inputs = $('.select2-input');
            var input = inputs[inputs.length - 1];
            input.autocomplete = AdpFieldsService.autocompleteValue(scope.field);
          },
          onChange: function(e) {
            var value;

            // order is important: for some reason select2 sends e.added and e.removed on reselect of same value
            // in this case we do nothing
            if (e.added) {
              value = e.added;
              value._id = value.id;
              value.table = scope.selectedSubject.selected;
              scope.setData(value);
            } else if (e.removed) {
              scope.setData(null);
            }

            scope.$apply();
          },
          initSelection: function (element, callback) {
            var data;
            if (scope.isEmpty()) return;
            data = scope.getData();

            callback({
              id: data._id,
              label: data.label,
              table: data.table
            });
          }
        };
      }
    }
  }
})();
