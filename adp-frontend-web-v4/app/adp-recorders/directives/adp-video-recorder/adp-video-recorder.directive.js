;(function () {
  angular
    .module('app.adpRecorders')
    .directive('adpVideoRecorder', adpVideoRecorder);

  function adpVideoRecorder(
    AdpVideoRecorderOptions,
    AdpBrowserService,
    AdpRecorderFactory
  ) {
    return {
      restrict: 'E',
      scope: {
        options: '=',
        resultFile: '=',
        player: '=?'
      },
      templateUrl: 'app/adp-recorders/directives/adp-video-recorder/adp-video-recorder.template.html',

      link: function ($scope, $element) {
        AdpRecorderFactory.mix($scope, $element, 'video');

        // override factory method
        $scope.setup = function () {
          $scope.options = _.merge($scope.DEFAULTS, $scope.options);
          $scope.options.plugins.record.videoMimeType = AdpBrowserService.isChrome() ?
            'video/webm;codecs=H264' :
            'video/mp4'
        };

        $scope.init(AdpVideoRecorderOptions);
      }
    }
  }
})();
