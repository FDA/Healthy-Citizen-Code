"use strict";

angular
  .module('app.adpAuth', [
    'ui.router',
    'vcRecaptcha',
    'app.adpForms'
  ])
  .config(function ($stateProvider) {
    $stateProvider
      .state('auth', {
        abstract: true,
        views: {
          root: {
            templateUrl: 'app/adp-auth/views/layout.template.html'
          }
        }
      })

      .state('auth.login', {
        url: '/login',
        views: {
          content: {
            templateUrl: 'app/adp-auth/views/login.html',
            controller: 'LoginController as vm'
          }
        },
        data: {
          title: 'Login',
          htmlId: 'auth-page',
          htmlClasses: 'login-page',
          redirectStrategy: 'guest'
        }
      })

      .state('auth.register', {
        url: '/register',
        views: {
          content: {
            templateUrl: 'app/adp-auth/views/register.html',
            controller: 'RegisterController as vm'
          }
        },
        data: {
          title: 'Register',
          htmlId: 'auth-page',
          redirectStrategy: 'guest'
        }
      })

      .state('auth.forgotPassword', {
        url: '/forgot-password',
        views: {
          content: {
            templateUrl: 'app/adp-auth/views/forgot-password.html'
          }
        },
        data: {
          title: 'Forgot Password',
          htmlId: 'auth-page',
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
            controller: function(AdpSessionService){
              AdpSessionService.logout();
            }
          }
        }
      });
  });
