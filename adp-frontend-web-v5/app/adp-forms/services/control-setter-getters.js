;(function () {
  'use strict';

  angular
    .module('app.adpForms')
    .factory('ControlSetterGetter', ControlSetterGetter);

  function ControlSetterGetter() {
    return function (args) {
      return function (val) {
        if (arguments.length) {
          setData(args, val);
        }

        return getData(args);
      }
    }

    function setData(args, value) {
      _.set(args.row, args.path, value);
      // args.data ref to args.row should became stale, because args.row mutated on every change
      // updating args.data to keep it fresh
      args.data = getData(args);
    }

    function getData(args) {
      return _.get(args.row, args.path);
    }
  }
})();
