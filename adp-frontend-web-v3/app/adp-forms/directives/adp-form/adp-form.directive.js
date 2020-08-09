;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpForm', adpForm);

  function adpForm(
    AdpNotificationService,
    AdpBrowserService,
    AdpFormService,
    $q
  ) {
    return {
      restrict: 'E',
      scope: {
        adpFields: '=',
        adpData: '=',
        adpSubmit: '=',
        adpFormParams: '=?',
        disableFullscreen: '='
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
          scope.fieldsWithShow = AdpFormService.filterFieldsWithShow(scope.fields, scope.type);
          scope.hasShowFields = !!scope.fieldsWithShow.length;

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

          scope.$watch('[form.$invalid, loading]', updateDisabledState);
          scope.$watch(
            function () { return angular.toJson(scope.form); },
            onFormUpdate
          )
        }

        function submit() {
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
          var invalid = values[0],
            loading = values[1];

          element.find('[type="submit"]')
            .prop('disabled', invalid || loading);
        }

        function onFormUpdate() {
          AdpFormService.forceValidation(scope.fields, scope.form);

          if (scope.hasShowFields) {
            AdpFormService.compareFieldsWithShow(scope.fieldsWithShow, scope.formData);
          }
        }

        function toggleFullscreen(e) {
          scope.isFullscreen = !scope.isFullscreen;
        }
      }
    }
  }
})();
