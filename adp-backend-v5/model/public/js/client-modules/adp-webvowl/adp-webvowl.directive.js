(function () {
  angular.module('app.adpWebvowl').directive('vowl', vowlDirective);

  /** @ngInject */
  function vowlDirective(APP_CONFIG, $sce) {
    return {
      restrict: 'E',
      scope: {
        title: '@?',
        subtitle: '@?',
        showObjectDetails: '=?',
        sidebar: '=?',
        showAbout: '=?',
        showOptions: '=?',
        showPauseResume: '=?',
        showReset: '=?',
        showModes: '=?',
        showFilter: '=?',
        showExport: '=?',
        showOntology: '=?',
        showSearch: '=?',
        showZoom: '=?',
        showFooter: '=?',
      },
      template:
        '<iframe ng-if="src" ng-src="{{src}}" frameborder="0" style="position: absolute; width: 100%; height:100%;"></iframe>',
      link: function (scope) {
        var defaults = {
          title: '',
          subtitle: '',
          sidebar: false,
          showAbout: false,
          showOptions: false,
          showPauseResume: false,
          showReset: false,
          showModes: false,
          showFilter: false,
          showExport: false,
          showOntology: false,
          showSearch: false,
          showZoom: false,
          showFooter: false,
          token: lsService.getToken(),
          apiUrl: APP_CONFIG.apiUrl,
        };

        var options = _.pick(scope, _.keys(defaults));
        options = _.assign({}, defaults, options);

        function getOptions(opts) {
          return _.map(opts, function (value, key) {
            if (['title', 'token', 'subtitle', 'apiUrl'].includes(key)) {
              return key + '=' + value;
            }
            return key + '=' + (value ? '1' : '0');
          }).join(';');
        }

        scope.src = APP_CONFIG.resourceUrl + '/public/js/lib/web-vowl/index.html';
        scope.src += '#opts=[' + getOptions(options) + ']';
        scope.src = $sce.trustAsResourceUrl(scope.src);
      },
    };
  }
})();
