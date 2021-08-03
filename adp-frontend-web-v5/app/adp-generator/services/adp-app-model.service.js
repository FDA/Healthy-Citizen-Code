;(function() {
  'use strict';

  angular
    .module('app.adpGenerator')
    .factory('AdpAppModel', AdpAppModel);

  /** @ngInject */
  function AdpAppModel(
    $http,
    $stateRegistry,
    AppGenerator,
    APP_CONFIG,
    AdpLayoutConfigService
  ) {
    return {
      getAppModel: getAppModel
    };

    function getAppModel(userData) {
      var token = userData && userData.token;

      return _request(token)
        .then(function (res) {
          return res.data.data;
        })
        .then(_regenerateApp);
    }

    function _request(token) {
      var endpoint = lsService.isGuest() ? 'build-app-model' : 'app-model';

      var req = {
        method: 'GET',
        url: [APP_CONFIG.apiUrl, endpoint].join('/')
      };

      if (token) {
        req.headers = {
          'Authorization': 'JWT ' + token
        };
      }

      return $http(req);
    }

    function _regenerateApp(data) {
      _.each($stateRegistry.states, function (state) {
        if (_.startsWith(state.name, 'app.')) {
          $stateRegistry.deregister(state.name);
        }
      });

      window.adpAppStore.appModel(data.models);
      window.adpAppStore.appInterface(data.interface);
      window.adpAppStore.mediaTypes(data.mediaTypes);

      AppGenerator.generateApp();
      AdpLayoutConfigService.updateThemeUI();

      return data;
    }
  }
})();
