;(function () {
  'use strict';

  angular
    .module('app.adpUploader')
    .directive('adpUploaderErrors', adpUploaderErrors);

  /** @ngInject */
  function adpUploaderErrors() {
    return {
      restrict: 'E',
      scope: {
        uploader: '='
      },
      templateUrl: 'app/adp-file-uploader/directives/adp-uploader-errors/adp-uploader-errors.template.html',
      link: function ($scope) {
        $scope.hide = function () {
          $scope.uploader.clearErrors();
        }
      }
    }
  }
})();
