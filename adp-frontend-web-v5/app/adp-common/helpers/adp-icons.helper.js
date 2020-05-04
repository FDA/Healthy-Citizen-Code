;(function () {
  angular
    .module("app.adpCommon")
    .factory("AdpIconsHelper", AdpIconsHelper);

  function AdpIconsHelper() {
    return {
      getIconClass:getIconClass
    }
    function getIconClass(icon) {
      if (icon.type === "dx") {
        return "dx-icon-" + icon.link;
      } else {
        return "fa fa-fw fa-" + icon.link;
      }
    }
  }
})();
