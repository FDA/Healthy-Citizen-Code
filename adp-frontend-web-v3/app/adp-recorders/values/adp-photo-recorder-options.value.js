;(function () {
  angular
    .module('app.adpRecorders')
    .value('AdpPhotoRecorderOptions', {
      controls: true,
      width: 640,
      height: 480,
      fluid: true,
      controlBar: {
        volumeMenuButton: false,
        fullscreenToggle: false
      },
      plugins: {
        record: {
          image: true,
          debug: true
        }
      }
    });
})();
