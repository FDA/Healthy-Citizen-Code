(function () {
  'use strict';

  angular.module('app.adpSyntheticGenerate').component('adpGenModal', {
    template:
      '<adp-form ' +
      '        args="vm.args"' +
      '        form-options="vm.formOptions">' +
      '    <form-header><h2 class="semi-bold">{{ vm.formParams.title }}</h2></form-header>' +
      '    <form-footer>' +
      '      <footer class="adp-action-b-container" adp-ui-buttons-handle-keyboard>' +
      '        <button type="button" ng-click="vm.onCancel()" class="adp-action-b-secondary">Cancel</button>' +
      '        <button type="submit" class="adp-action-b-primary">{{ vm.formParams.btnText }}</button>' +
      '      </footer>' +
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
