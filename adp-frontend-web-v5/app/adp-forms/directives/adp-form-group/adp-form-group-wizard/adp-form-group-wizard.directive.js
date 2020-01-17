;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormGroupWizard', adpFormGroupWizard);

  function adpFormGroupWizard(
    AdpFieldsService,
    AdpFormService
  ) {
    return {
      restrict: 'E',
      scope: {
        fields: '=',
        formData: '=',
        formParams: '=',
        schema: '=',
        validationParams: '='
      },
      templateUrl: 'app/adp-forms/directives/adp-form-group/adp-form-group-wizard/adp-form-group-wizard.html',
      require: '^^form',
      link: function (scope, el, attrs, form) {
        (function init() {
          scope.form = form;
          scope.groupHasErrors = AdpFormService.groupHasErrors;
          scope.groupCompleted = AdpFormService.groupCompleted;

          scope.groups = getGroups();
          scope.names = getNames();
          scope.currentName = getInitialCurrent();

          scope.$watch(namesString, onUpdate);
        })();

        function namesString() {
          var names = getNames();
          return names.join(';');
        }

        function onUpdate(newValue, oldValue) {
          if (newValue === oldValue) {
            return;
          }

          scope.groups = getGroups();
          scope.names = getNames();

          var currentNameIsNull = scope.names.indexOf(scope.currentName) === -1;

          if (currentNameIsNull) {
            scope.currentName = getInitialCurrent();
          }
        }

        function display(path) {
          var visibilityMap = scope.validationParams.formParams.visibilityMap;
          return visibilityMap[path];
        }
        scope.display = display;

        function getGroups() {
          return _.map(scope.fields.groups, function (group) {
            return display(group.fieldName) ? group : null;
          });
        }

        function getNames() {
          return _.reduce(scope.fields.groups, function (acc, group) {
            if (display(group.fieldName)) {
              acc.push(group.fieldName);
            }

            return acc;
          }, []);
        }

        function getInitialCurrent() {
          return scope.names[0];
        }

        scope.isEmpty = function() {
          return _.isEmpty(scope.names);
        };

        scope.setCurrent = function (name) {
          if (name === scope.currentName) return;

          var fieldGroup = _.find(scope.groups, ['fieldName', name]);
          AdpFormService.setGroupDirty(fieldGroup, scope.form);

          scope.currentName = name;
        };

        scope.next = function () {
          var currentIndex = scope.names.indexOf(scope.currentName);
          var nextName = scope.names[currentIndex + 1];

          scope.setCurrent(nextName);
        };

        scope.prev = function () {
          var currentIndex = scope.names.indexOf(scope.currentName);
          var prevName = scope.names[currentIndex - 1];

          scope.setCurrent(prevName);
        };

        scope.isFirst = function () {
          return scope.names.indexOf(scope.currentName) === 0;
        };

        scope.isLast = function () {
          return scope.names.indexOf(scope.currentName) === scope.names.length - 1;
        };

        scope.getHeader = function (group) {
          var params = {
            fieldData: getData(group),
            formData: scope.formData,
            fieldSchema: group,
          };

          return AdpFieldsService.getHeaderRenderer(params);
        };

        function getData(group) {
          var data = {};

          _.each(group.fields, function (f) {
            data[f.fieldName] = scope.formData[f.fieldName];
          });

          return data;
        }
      }
    }
  }
})();
