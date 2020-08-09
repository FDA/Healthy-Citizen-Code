;(function () {
  angular
    .module('app.adpRecorders')
    .directive('adpPhotoRecorder', adpPhotoRecorder);

  function adpPhotoRecorder(
    AdpPhotoRecorderOptions,
    AdpRecorderFactory
  ) {
    return {
      restrict: 'E',
      scope: {
        options: '=',
        resultFile: '=',
        player: '=?'
      },
      templateUrl: 'app/adp-recorders/directives/adp-photo-recorder/adp-photo-recorder.template.html',
      link: function ($scope, $element) {
        AdpRecorderFactory.mix($scope, $element, 'image');
        $scope.init(AdpPhotoRecorderOptions);
      }
    }
  }
})();
