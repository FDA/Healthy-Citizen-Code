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
        url: '/login?returnUrl',
        params: {
          returnUrl: null
        },
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

      .state('auth.forgot', {
        url: '/password/forgot',
        views: {
          content: {
            templateUrl: 'app/adp-auth/views/forgot.html',
            controller: 'ForgotController as vm'
          }
        },
        data: {
          title: 'Forgot Password',
          htmlId: 'auth-page',
          redirectStrategy: 'guest'
        }
      })

      .state('auth.reset', {
        url: '/password/reset?token&login',
        params: {
          token: null,
          login: null
        },
        views: {
          content: {
            templateUrl: 'app/adp-auth/views/reset.html',
            controller: 'ResetController as vm'
          }
        },
        data: {
          title: 'Reset Password',
          htmlId: 'auth-page',
          redirectStrategy: 'guest'
        }
      });
  });
