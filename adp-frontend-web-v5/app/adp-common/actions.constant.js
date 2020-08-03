;(function () {
  angular
    .module('app.adpCommon')
    .constant('ACTIONS', {
      CREATE: 'create',
      CLONE: 'clone',
      CLONE_DATASET: 'cloneDataSet',
      UPDATE: 'update',
      DELETE: 'delete',
      VIEW_DETAILS: 'viewDetails',
      VIEW: 'view',
    });
})();
