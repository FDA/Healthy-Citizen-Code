  ;(function () {
  angular
    .module('app.adpUploader')
    .value('adpFileUploaderOptions', {
      'image': {
        'multiple': false,
        "enableDragAndDrop": true,
        "maxFileSize": 5000000,
        'mimeType': 'images',
        "minWidth": 50,
        "maxWidth": 5000,
        "minHeight": 50,
        "maxHeight": 5000,
        "enableCropper": true,
        "enablePhotoCapture": true,
        "aspectRatio": 1
      },
      'file': {
        'multiple': false,
        "enableDragAndDrop": true,
        "maxFileSize": 5000000,
        'mimeType': 'any'
      },
      'video': {
        'multiple': false,
        "enableDragAndDrop": true,
        "maxFileSize": 5000000,
        'mimeType': 'video',
        "enableWebcam": true
      },
      'audio': {
        'multiple': false,
        "enableDragAndDrop": true,
        "maxFileSize": 5000000,
        'mimeType': 'audio',
        "enableMicrophone": true
      }
    });
})();
