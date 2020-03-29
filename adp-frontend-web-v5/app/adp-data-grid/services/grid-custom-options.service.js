;(function () {
  "use strict";

  var URL_PARAM_NAME = "customOpt";

  angular
    .module("app.adpCommon")
    .factory("AdpGridCustomOptionsService", AdpGridCustomOptionsService);

  /** @ngInject */
  function AdpGridCustomOptionsService(
    $location,
    $state
  ) {
    function AdpGridCustomOptions() {
      this.gridComponent = null;
      this.val = {};
      this.handlers = {change: {}};
      parseFromUrl.call(this);
    }

    AdpGridCustomOptions.prototype.setGridComponent = function (grid) {
      this.gridComponent = grid;
    };

    AdpGridCustomOptions.prototype.value = function (param1, param2) {
      var self = this;
      if (typeof param1 === "undefined") {
        return this.val;
      } else if (typeof param1 === "object") {
        _.each(param1, function (v, k) {
          if (self.val[k] !== v) {
            self.val[k] = v;
            self._trigger("change", k, v);
          }
        });
      } else if (typeof param1 === "string") {
        if (typeof param2 === "undefined") {
          return this.val[param1];
        } else {
          if (this.val[param1] !== param2) {
            this.val[param1] = param2;
            this._trigger("change", param1, param2);
          }
        }
      }
    };

    AdpGridCustomOptions.prototype.setHandler = function (eventName, attr, cb) {
      if (!this.handlers[eventName][attr]) {
        this.handlers[eventName][attr] = [];
      }
      this.handlers[eventName][attr].push(cb);
    };

    AdpGridCustomOptions.prototype._trigger = function (eventName, _attr, newval) {
      var self = this;
      _.each([_attr, "$$$"], function (attr) {
        if (self.handlers[eventName] && self.handlers[eventName][attr] && self.handlers[eventName][attr].length) {
          _.each(self.handlers[eventName][attr], function (cb) {
            cb.call(self, newval);
          })
        }
      });

      mapToUrl.call(self);
    };

    function mapToUrl() {
      var currentParams = $location.search();
      var withoutEmpty = _.pickBy(this.value(), _.identity); //  This is generally wrong - removes ===false, and ===0, and ==='' but ok by now
      var encodedJson = _.keys(withoutEmpty).length ? encodeURIComponent(JSON.stringify(withoutEmpty)) : "";

      if (encodedJson) {
        currentParams[URL_PARAM_NAME] = encodedJson;
      } else {
        _.unset(currentParams, URL_PARAM_NAME);
      }

      $location.search(currentParams);
    }

    function parseFromUrl() {
      var result = {};

      try {
        result = JSON.parse(decodeURIComponent($state.params[URL_PARAM_NAME]) || "");
      } catch (e) {
      }

      this.value(result);
    }

    function create() {
      return new AdpGridCustomOptions;
    }

    return {
      create: create
    };
  }
})();
