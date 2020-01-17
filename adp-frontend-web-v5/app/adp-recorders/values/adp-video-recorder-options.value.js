;(function () {
  angular
    .module('app.adpRecorders')
    .value('AdpVideoRecorderOptions', {
      controls: true,
      width: 640,
      height: 480,
      fluid: true,
      controlBar: {
        volumeMenuButton: false
      },
      plugins: {
        record: {
          audio: true,
          video: true,
          maxLength: 5
        }
      }
    });
})();
