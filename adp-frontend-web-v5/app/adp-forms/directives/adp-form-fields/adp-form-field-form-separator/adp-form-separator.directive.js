;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .directive('adpFormSeparator', adpFormSeparator);

  function adpFormSeparator() {
    return {
      restrict: 'E',
      scope: {
        fieldSchema: '<',
      },
      template: '<div class="adp-form-separator-container" style="{{separatorContainerStyleString}}">' +
        '<div class="adp-form-separator-line" style="{{separatorLineStyleString}}"></div>' +
        '</div>',
      link: function (scope) {
        var styleAttributes = {
          lineWidth: 'border-top-width',
          lineColor: 'border-color',
          lineStyle: 'border-style',
        }
        var parameters = scope.fieldSchema.parameters;
        var lineStyle = getLineStyle(parameters);
        var containerStyle = {};

        if (parameters.height) {
          containerStyle.height = parameters.height;
        }

        scope.separatorLineStyleString = transformStyleToString(lineStyle);
        scope.separatorContainerStyleString = transformStyleToString(containerStyle);

        function getLineStyle(params) {
          var style = {};

          _.each(styleAttributes, function (cssName, attrName) {
            if (params[attrName]) {
              style[cssName] = params[attrName];
            }
          })

          return style;
        }

        function transformStyleToString(styleObj) {
          return _.reduce(styleObj,
            function (result, value, key) {
              return result + key + ':' + transformStyleValue(value) + ';';
            }, '');

          function transformStyleValue(val) {
            return _.isNumber(val) ? val + 'px' : val;
          }
        }
      }
    }
  }
})();
