;(function () {
  "use strict";

  function getStateUrl(url, suffix) {
    return !!suffix ? '/' + suffix + url : url;
  }

  angular
    .module('app.adpAuth', [
      'ui.router',
      'vcRecaptcha',
      'app.adpForms'
    ])
    /** @ngInject **/
    .config(function ($stateProvider, APP_CONFIG) {
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
          url: getStateUrl('/login?returnUrl', APP_CONFIG.appSuffix),
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
          url: getStateUrl('/register', APP_CONFIG.appSuffix),
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
          url: getStateUrl('/password/forgot', APP_CONFIG.appSuffix),
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
          url: getStateUrl('/password/reset?token&login', APP_CONFIG.appSuffix),
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
})()
