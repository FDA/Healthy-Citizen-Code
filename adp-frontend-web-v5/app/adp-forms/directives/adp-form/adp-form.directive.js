;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpForm', adpForm);

  function adpForm(
    AdpNotificationService,
    AdpFieldsService,
    AdpFormService,
    AdpFormDataUtils,
    RequiredExpression,
    ShowExpression,
    $timeout,
    UploadError,
    ErrorHelpers,
    $q
  ) {
    return {
      restrict: 'E',
      scope: {
        adpFields: '=',
        adpData: '=',
        adpSubmit: '=',
        adpFormParams: '=?',
        disableFullscreen: '=',
        schema: '='
      },
      transclude: {
        'header': '?formHeader',
        'body': '?formBody',
        'footer': 'formFooter'
      },
      templateUrl: 'app/adp-forms/directives/adp-form/adp-form.html',
      link: function (scope, element) {
        var visibilityMap = {};
        scope.visibilityMap = visibilityMap;

        function init() {
          scope.formData = _.cloneDeep(scope.adpData) || {};
          scope.adpFormParams = scope.adpFormParams || {};

          scope.groupingType = AdpFormService.getGroupingType(scope.adpFormParams);

          scope.fields = scope.groupingType ?
            AdpFieldsService.getFormGroupFields(scope.adpFields, scope.groupingType) :
            AdpFieldsService.getFormFields(scope.adpFields);

          scope.errorCount = 0;

          scope.loading = false;
          scope.isFullscreen = false;
          scope.uploaderCnt = 0;

          bindEvents();

          // todo: refactor as abstraction with methods, like path(), child(), parent() and etc
          var formParams = {
            path: null,
            row: scope.formData,
            modelSchema: scope.schema,
            action: scope.adpFormParams && scope.adpFormParams.actionType,
            visibilityMap: visibilityMap,
            requiredMap: {},
          };

          _.each(scope.fields.groups, function (group, name) {
            visibilityMap[name] = true;
          });

          // DEPRECATED: will be replaced with formParams
          // validationParams fields naming is wrong, use formParams instead
          // modelSchema - grouped fields
          // schema - original ungrouped schema
          scope.validationParams = {
            field: scope.adpField,
            fields: scope.adpFields,
            formData: scope.adpFormData,
            modelSchema: scope.adpFields,
            schema: scope.schema,
            $action: scope.adpFormParams && scope.adpFormParams.actionType,

            formParams: formParams
          };

          $timeout(function () {
            applyActionClass(formParams.action);
            bindFormEvents();

            RequiredExpression.eval(scope.validationParams.formParams, scope.form);

            // initial run to setup fields visibility
            ShowExpression.eval({
              formData: scope.formData,
              schema: scope.schema,
              groups: scope.fields.groups,
              visibilityMap: visibilityMap,
              actionType: scope.adpFormParams.actionType
            });
          });
        }

        init();

        function applyActionClass(action) {
          if (!action) {
            return;
          }

          scope.formActionClass = 'form-action-' + action;
        }

        // there are two functions to bind events:
        // the second one is for avoiding error for form when nested form are not rendered
        // the first one keep order of event triggered by child directives
        function bindEvents() {
          scope.$on('adpFileUploaderInit', function () {
            scope.uploaderCnt++;
          });
          scope.submit = submit;
        }

        function bindFormEvents() {
          scope.$watch('[loading]', updateDisabledState);
          scope.$watch(
            function () {
              return angular.toJson(scope.form);
            },
            onFormUpdate
          )
        }

        function submit() {
          if (scope.form.$invalid) {
            scrollToError();
            return;
          }
          scope.loading = true;

          handleUploaders(scope.formData)
            .then(function () {
              var formData = AdpFormDataUtils.transformDataBeforeSending(scope.formData, scope.schema);
              return scope.adpSubmit(formData);
            })
            .catch(function (error) {
              ErrorHelpers.handleError(error, 'Unknown error in form');
            })
            .finally(function () {
              scope.loading = false;
            });
        }

        function handleUploaders(formData) {
          if (scope.uploaderCnt === 0) {
            return $q.when(scope.formData);
          }

          var uploadersFinished = 0;

          return $q(function (resolve) {
            var removeEndListenerFn = scope.$on('adpFileUploadComplete', onUploadComplete);
            var removeErrorListenerFn = scope.$on('adpFileUploadError', onUploadError);
            scope.$broadcast('adpFileUploadStart');

            function onUploadComplete() {
              uploadersFinished++;

              if (uploadersFinished >= scope.uploaderCnt) {
                removeListeners();
                resolve(formData);
              }
            }

            function onUploadError(_e, response) {
              removeListeners();
              throw new UploadError(response.message);
            }

            function removeListeners() {
              removeEndListenerFn();
              removeErrorListenerFn();
            }
          });
        }

        function updateDisabledState(values) {
          if (!element || !element.find('[type="submit"]').length) return;
          var loading = values[0];

          element.toggleClass('adp-disabled-form', loading);

          element.find('[type="submit"]')
            .prop('disabled', loading);
        }

        function onFormUpdate(newVal, oldVal) {
          if (newVal === oldVal) {
            return;
          }

          AdpFormService.forceValidation(scope.form);

          ShowExpression.eval({
            formData: scope.formData,
            schema: scope.schema,
            groups: scope.fields.groups,
            visibilityMap: visibilityMap,
            actionType: scope.adpFormParams.actionType
          });

          RequiredExpression.eval(scope.validationParams.formParams, scope.form);

          if (scope.form.$submitted) {
            scope.errorCount = AdpFormService.countErrors(scope.form);
          }
        }

        // refactor: form move to service
        function scrollToError() {
          var $errorNode = $('.ng-invalid').closest('adp-form-field-container');
          var $ngForm = $('.ng-invalid').closest('ng-form');
          var $scrollTarget;

          $scrollTarget = $ngForm.length > 0 ? $ngForm : $errorNode;

          var $scrollContainer = $('[uib-modal-window="modal-window"]');
          var scrollPos;

          if ($scrollContainer.length === 0) {
            scrollPos = $scrollTarget.offset().top;
            $scrollContainer = $('html, body');
          } else {
            scrollPos = $scrollTarget.offset().top - $scrollContainer.offset().top + $scrollContainer.scrollTop()
          }

          $($scrollContainer).animate({
            scrollTop: scrollPos
          }, 300);
        }
      }
    }
  }
})();
