;(function () {
  angular
    .module('app.adpCommon')
    .constant('ACTIONS', {
      CREATE: 'create',
      CLONE: 'clone',
      UPDATE: 'update',
      DELETE: 'delete',
      VIEW_DETAILS: 'viewDetails',
      VIEW: 'view',
    });
})();
