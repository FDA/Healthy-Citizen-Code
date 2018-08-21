"use strict";


angular
  .module('app.adpLayout', ['ui.router'])
  .config(function ($stateProvider) {
    $stateProvider
      .state('app', {
        abstract: true,
        views: {
          root: {
            templateUrl: 'app/adp-layout/layout.tpl.html',
            controller: 'LayoutController as vm'
          }
        }
      });
  });

