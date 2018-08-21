(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('lookupControl', lookupControl);

  function lookupControl(APP_CONFIG) {
    return {
      restrict: 'E',
      scope: {
        field: '=',
        adpFormData: '=',
        uiProps: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-controls/lookup-control/lookup-control.html',
      require: '^^form',
      link: function (scope) {
        scope.subjects = scope.field.lookup.table;
        scope.subjectNames = _.keys(scope.field.lookup.table);
        scope.subjectId = scope.field.lookup.id;

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

        scope.options = {
          allowClear: true,
          placeholder: '-',
          nextSearchTerm: function (selected) {
            if (selected && selected.label) {
              return selected.label;
            }

            return '';
          },
          formatResult: function(state) {
            // if option group
            if (!state.id) return state.text;

            return state.label;
          },
          formatSelection: function(state) {
            // if option group
            if (!state.id) return state.text;

            return state.label;
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
          onChange: function(e) {
            var value;

            if (e.added) {
              value = e.added;
              value._id = value.id;
              value.table = scope.selectedSubject.selected;
              scope.setData(value);
            }

            if (e.removed) {
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
              label: data.label
            });
          }
        }


      }
    }
  }
})();
