;(function () {
  angular
    .module('app.adpRecorders')
    .value('AdpPhotoRecorderOptions', {
      width: 800,
      height: 600,
      options: {
        controls: true,
        // width, height and aspect ratio  attributes are set in directive depending of screen size
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
      }
    });
})();
