/** @ngInject */
function NotificationPageController(
  AdpDataService,
  AdpSchemaService,
  $state,
  AdpPageActions,
  $q,
  $scope
) {
  const vm = this;
  $state.current.data.pageParams = {
    fieldName: 'Notifications',
    link: '/notifications',
    schemaPath: 'notifications',
  };

  vm.pageParams = AdpSchemaService.getPageParams();
  vm.resourceUrl = AdpDataService.getResourceUrl(vm.pageParams.link);

  vm.schema = AdpSchemaService.getCurrentSchema();
  vm.loading = true;
  vm.pageData = [];

  vm.showCreate = (function createIsPermitted() {
    return _.hasIn(vm.schema, 'actions.fields.create');
  }());

  vm.actionCbs = AdpPageActions.getActionsWithMessages((data) => {
    vm.pageData = data;
  });
  vm.create = vm.actionCbs.create;

  AdpPageActions.getPageData()
    .then((data) => {
      vm.pageData = data;
      vm.loading = false;
    });

  function updateNotification(id) {
    const originalNotification = _.find(vm.pageData, i => i._id === id);
    if (!originalNotification) return;

    const copyOfNotification = _.chain(originalNotification)
      .cloneDeep()
      .set('new', false)
      .value();

    const updateAction = vm.actionCbs.update;
    updateAction(copyOfNotification, { btnText: 'Close' });
  }

  // eslint-disable-next-line
  $(document.body).on('click.notification', (e) => {
    const { target } = e.originalEvent;
    const subjectNode = target.closest('[data-notification-id]');

    if (subjectNode === null) {
      return;
    }

    const { notificationId } = subjectNode.dataset;
    e.preventDefault();
    updateNotification(notificationId);
  });

  $scope.$on('$destroy', () => {
    $(document.body).off('click.notification');
  });
}

export default ['NotificationPageController', NotificationPageController];
