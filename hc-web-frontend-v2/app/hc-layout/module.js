"use strict";


angular
  .module('app.hcLayout', ['ui.router'])
  .config(function ($stateProvider) {
    $stateProvider
      .state('app', {
        abstract: true,
        views: {
          root: {
            templateUrl: 'app/hc-layout/layout.tpl.html',
            controller: 'LayoutController as vm'
          }
        }
      });
  });

