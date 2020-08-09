;(function () {
  angular
    .module('app.adpRecorders')
    .value('AdpAudioRecorderOptions', {
      controls: true,
      width: 640,
      height: 480,
      fluid: true,
      plugins: {
        wavesurfer: {
          src: 'live',
          waveColor: 'green',
          progressColor: '#2E732D',
          debug: true,
          cursorWidth: 1,
          msDisplayMax: 20,
          hideScrollbar: true
        },
        record: {
          audio: true,
          video: false,
          maxLength: 30,
          debug: true,
          audioEngine: 'recordrtc',
          audioWorkerURL: ''
        }
      }
    });
})();
