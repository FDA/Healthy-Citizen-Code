;(function () {
  angular
    .module('app.adpRecorders')
    .directive('adpAudioRecorder', AdpAudioRecorder);

  function AdpAudioRecorder(
    AdpAudioRecorderOptions,
    AdpAudioTypesService,
    AdpRecorderFactory
  ) {
    return {
      restrict: 'E',
      scope: {
        options: '=',
        resultFile: '=',
        player: '=?'
      },
      templateUrl: 'app/adp-recorders/directives/adp-audio-recorder/adp-audio-recorder.template.html',

      link: function ($scope, $element) {
        AdpRecorderFactory.mix($scope, $element, 'audio');

        $scope.engines = AdpAudioTypesService.getSupportedTypesNames();
        $scope.currentEngine = $scope.engines[0];
        $scope.typesMap = AdpAudioTypesService.getSupportedTypes();

        $scope.init(AdpAudioRecorderOptions);

        $scope.setEngine = function () {
          $scope.options = _.merge($scope.options, $scope.typesMap[$scope.currentEngine]);
          $scope.reInit();
        };
      }
    }
  }
})();
