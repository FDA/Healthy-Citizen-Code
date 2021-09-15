;(function () {
  angular
    .module('app.adpCommon')
    .factory('AdpIconsHelper', AdpIconsHelper);

  function AdpIconsHelper(APP_CONFIG, AdpUnifiedArgs) {
    return {
      getIconHtml: getIconHtml
    }

    function getIconHtml(icon, _options) {
      var classNames = ['adp-icon'];
      var options = _options || {};
      var $el = $('<i>');

      if (icon.type === 'class') {
        classNames.push('adp-icon-base');
        classNames.push(icon.link);
      } else if (icon.type === 'image') {
        var link = icon.link;

        if (link.substr(0, 4) !== 'http') {
          link = APP_CONFIG.resourceUrl + link;
        }
        $el.css({'backgroundImage': 'url(' + link + ')'});
        classNames.push('adp-icon-base');
      } else if (icon.type === 'action') {
        var helperAction = _.get(appModelHelpers, 'LabelRenderers.' + icon.link);

        if (helperAction) {
          var context = AdpUnifiedArgs.getHelperParamsWithConfig({
            path: '',
            formData: null,
            action: 'icon',
            schema: icon,
            fieldSchema: icon,
            options: options,
          });

          helperAction.call(context).then(function (link) {
            $el.css({backgroundImage: 'url(' + link + ')'});
          });

          classNames.push('adp-icon-base');
        }
      } else if (icon.type === 'dx') {
        classNames.push('dx-icon-' + icon.link);
      } else if (icon.type === 'font-awesome-brands') {
        classNames.push('fab fa-' + icon.link);
      } else {
        classNames.push('fa fa-fw fa-' + icon.link);
      }

      if (options.className) {
        classNames.push(options.className);
      }

      if (options.hint) {
        $el.attr('title', options.hint);
      }

      $el.addClass(classNames);

      return $el;
    }
  }
})();
