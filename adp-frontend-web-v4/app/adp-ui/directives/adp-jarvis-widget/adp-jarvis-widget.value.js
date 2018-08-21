;(function () {
  'use strict';

  angular
    .module('app.adpUi')
    .value('jarvisWidgetsDefaults', {
      grid: '.jarviswidget-grid',
      widgets: '.jarviswidget',
      localStorage: false,
      toggleButton: true,
      toggleClass: 'fa fa-minus | fa fa-plus',
      toggleSpeed: 200,
      deleteButton: false,
      editButton: false,
      colorButton: false,
      fullscreenButton: false,
      customButton: false
    });
})();