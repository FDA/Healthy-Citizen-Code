;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpForm', adpForm);

  function adpForm(
    AdpNotificationService,
    AdpBrowserService,
    AdpFormService,
    $timeout,
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
        function init() {
          scope.formData = scope.adpData || {};

          scope.typeMap = AdpFormService.getTypeMap();
          scope.type = AdpFormService.getType(scope.adpFormParams);
          scope.fields = AdpFormService.getFormFields(scope.adpFields, scope.type);
          //
          scope.fieldsWithShow = AdpFormService.filterFieldsWithShow(scope.fields);
          scope.hasShowFields = !!scope.fieldsWithShow.length;
          scope.errorCount = 0;

          scope.loading = false;
          scope.isFullscreen = false;
          scope.uploaderCnt = 0;

          bindEvents();
        }
        init();

        function bindEvents() {
          scope.$on('adpFileUploaderInit', function () {
            scope.uploaderCnt++;
          });
          scope.submit = submit;
          scope.toggleFullscreen = toggleFullscreen;
          scope.isFullscreenSupported = AdpBrowserService.isFullscreenSupported;

          scope.$watch('[loading]', updateDisabledState);
          scope.$watch(
            function () { return angular.toJson(scope.form); },
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
            .then(function (data) {
              return scope.adpSubmit(data);
            })
            .catch(function (error) {
              if (error.name === 'UploadError') {
                AdpNotificationService.notifyError(error.message);
              }

              console.log('Catch error in form', error);
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

          return $q(function (resolve, reject) {
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
              reject({message: response.message, name: 'UploadError'});
            }

            function removeListeners() {
              removeEndListenerFn();
              removeErrorListenerFn();
            }
          });
        }

        function updateDisabledState(values) {
          if (!element || !element.find('[type="submit"]').length) return;
          var loading = values[1];

          element.find('[type="submit"]')
            .prop('disabled', loading);
        }

        function onFormUpdate() {
          AdpFormService.forceValidation(scope.form);

          if (scope.form.$submitted) {
            scope.errorCount = AdpFormService.countErrors(scope.form);
          }

          if (scope.hasShowFields) {
            AdpFormService.compareFieldsWithShow(scope.fieldsWithShow, scope.formData, scope.adpFormParams);
          }
        }

        function toggleFullscreen(e) {
          scope.isFullscreen = !scope.isFullscreen;
        }

        function scrollToError() {
          var $errorNode = $('.ng-invalid').closest('adp-form-field-container');
          var $ngForm = $('.ng-invalid').closest('ng-form');
          var $scrollTarget;

          $scrollTarget = $ngForm.length > 0 ? $ngForm : $errorNode;

          var $scrollContainer = $('[uib-modal-window="modal-window"]');
          var scrollPos;

          if (_.isEmpty($scrollContainer)) {
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
