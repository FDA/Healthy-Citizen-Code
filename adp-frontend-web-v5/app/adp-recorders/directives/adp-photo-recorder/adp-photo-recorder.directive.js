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

        var options = AdpPhotoRecorderOptions.options;
        var isVertical = $(window).width() < $(window).height();
        var bigSide = AdpPhotoRecorderOptions.width;
        var smallSide = AdpPhotoRecorderOptions.height;
        var width = isVertical ? smallSide : bigSide;
        var height = isVertical ? bigSide : smallSide;

        options.width = width;
        options.height = height;
        options.aspectRatio = width + ":" + height;

        $scope.init(options);
      }
    }
  }
})();
