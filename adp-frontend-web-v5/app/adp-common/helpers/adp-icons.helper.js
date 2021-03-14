;(function () {
  angular
    .module("app.adpCommon")
    .factory("AdpIconsHelper", AdpIconsHelper);

  function AdpIconsHelper(APP_CONFIG) {
    return {
      getIconHtml: getIconHtml
    }

    function getIconHtml(icon, _options) {
      var classNames = ['adp-icon'];
      var tagProps = [];
      var options = _options || {};

      if (icon.type === "class") {
        classNames.push("adp-icon-base");
        classNames.push(icon.link);
      } else if (icon.type === "image") {
        var link = icon.link;

        if (link.substr(0, 4) !== "http") {
          link = APP_CONFIG.apiUrl + link;
        }
        tagProps.push("style=\"background-image:url(" + link + ")\"");
        classNames.push("adp-icon-base");
      } else if (icon.type === "dx") {
        classNames.push("dx-icon-" + icon.link);
      } else if (icon.type === "font-awesome-brands") {
        classNames.push("fab fa-" + icon.link);
      } else {
        classNames.push("fa fa-fw fa-" + icon.link);
      }

      if (options.className) {
        classNames.push(options.className);
      }

      if (options.hint) {
        tagProps.push("title='" + options.hint + "\"");
      }

      tagProps.push("class=\"" + classNames.join(" ") + "\"");

      return "<i " + tagProps.join(" ") + "></i>";
    }
  }
})();
