(function () {
  'use strict';

  angular.module('app.adpSyntheticGenerate').component('adpGenModal', {
    template:
      '<adp-form ' +
      '        adp-submit="vm.onSubmit"' +
      '        adp-data="vm.data"' +
      '        adp-form-params="vm.formParams"' +
      '        adp-fields="vm.fields"' +
      '        schema="vm.schema"' +
      '        disable-fullscreen="true">' +
      '    <form-header><h2 class="semi-bold">{{ vm.formParams.title }}</h2></form-header>' +
      '    <form-footer>' +
      '        <button type="submit" class="btn btn-primary">{{ vm.formParams.btnText }}</button>' +
      '        <button type="button" ng-click="vm.onCancel()" class="btn btn-default">Cancel</button>' +
      '    </form-footer>' +
      '</adp-form>',
    bindings: {
      resolve: '<',
      close: '&',
      dismiss: '&',
    },
    controller: 'AdpGenModalController',
    controllerAs: 'vm',
  });
})();
