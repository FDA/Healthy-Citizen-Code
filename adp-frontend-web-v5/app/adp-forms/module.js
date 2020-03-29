;(function () {
  'use strict';

  angular.module('app.adpForms', [
    'ngMessages',
    'ui.bootstrap.datetimepicker',
    'ngTagsInput'
  ]);

  angular
    .module('app.adpForms')
    .config(function () {
      CKEDITOR.disableAutoInline = true;
      ace.config.set('workerPath', 'lib/ace-builds/src-noconflict');
    });
})();
