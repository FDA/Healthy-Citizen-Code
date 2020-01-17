import template from './spl-viewer.html';

/* @ngInject */
function splViewer(APP_CONFIG, $sce) {
  return {
    restrict: 'E',
    template,
    scope: {
      data: '=',
    },
    link(scope) {
      scope.toHtml = function (text) {
        return $sce.trustAsHtml(text);
      };
    },
  };
}

export default ['splViewer', splViewer];
