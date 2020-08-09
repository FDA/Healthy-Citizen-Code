"use strict";

angular
  .module('app.hcAuth', [
    'ui.router',
    'vcRecaptcha',
    'app.hcForms',
    'app.hcCommon'
  ])
  .config(function ($stateProvider) {
    $stateProvider
      .state('auth', {
        abstract: true,
        views: {
          root: {
            templateUrl: 'app/hc-auth/views/layout.template.html'
          }
        }
      })

      .state('auth.login', {
        url: '/login',
        views: {
          content: {
            templateUrl: 'app/hc-auth/views/login.html',
            controller: 'LoginController as vm'
          }
        },
        data: {
          title: 'Login',
          htmlId: 'extr-page',
          redirectStrategy: 'guest'
        }
      })

      .state('auth.register', {
        url: '/register',
        views: {
          content: {
            templateUrl: 'app/hc-auth/views/register.html',
            controller: 'RegisterController as vm'
          }
        },
        data: {
          title: 'Register',
          htmlId: 'extr-page',
          redirectStrategy: 'guest'
        }
      })

      .state('auth.forgotPassword', {
        url: '/forgot-password',
        views: {
          content: {
            templateUrl: 'app/hc-auth/views/forgot-password.html'
          }
        },
        data: {
          title: 'Forgot Password',
          htmlId: 'extr-page',
          redirectStrategy: 'guest'
        }
      })

      .state('auth.logout', {
        url: '/logout',
        data: {
          redirectStrategy: 'user'
        },
        views: {
          content: {
            controller: function(HcSessionService){
              HcSessionService.logout();
            }
          }
        }
      });
  });
