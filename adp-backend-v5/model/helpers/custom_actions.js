/**
 * CustomActions are called when a user clicks a button in DataTables linked to a custom action
 *
 * Each handler receives single parameter - data that the DataTables row represents
 */

function runByRecordId(confirmMessage, successMessageFunc, errorMessageFunc) {
  // eslint-disable-next-line no-undef
  const injector = angular.element(document).injector();
  const appConfig = injector.get('APP_CONFIG');
  const adpModalService = injector.get('AdpModalService');
  const adpNotificationService = injector.get('AdpNotificationService');
  const adpErrorHelper = injector.get('ErrorHelpers');
  const http = injector.get('$http');

  return adpModalService
    .confirm({ message: confirmMessage })
    .then(() => {
      const { action } = this;
      const redirectUrl = _.get(this, `modelSchema.actions.fields.${action}.action.redirectUrl`, '');
      const url = `${appConfig.apiUrl}${redirectUrl}/${this.row._id}`;

      return http.get(url);
    })
    .then(({ data }) => {
      if (data.success) {
        return adpNotificationService.notifySuccess(successMessageFunc(data));
      }
      adpNotificationService.notifyError(errorMessageFunc(data));
    })
    .catch((error) => adpErrorHelper.handleError(error));
}

module.exports = () => {
  const m = {
    deleteBackgroundJob() {
      // eslint-disable-next-line no-undef
      const injector = angular.element(document).injector();
      const GraphqlRequest = injector.get('GraphqlRequest');
      const adpModalService = injector.get('AdpModalService');
      const adpNotificationService = injector.get('AdpNotificationService');
      const adpErrorHelper = injector.get('ErrorHelpers');

      function deleteJob({ id, queueName }) {
        return GraphqlRequest({
          name: 'backgroundJobsDeleteOne',
          query: `mutation m($filter: BackgroundJobIdInput!) {
            backgroundJobsDeleteOne (filter: $filter) { deletedCount }
          }`,
          variables: { filter: { jobId: id, queueName } },
        });
      }

      return adpModalService
        .confirm({ message: 'Are you sure that you want to delete this job?' })
        .then(() => deleteJob(this.row))
        .then(() => {
          adpNotificationService.notifySuccess('Background job successfully deleted');

          // eslint-disable-next-line no-undef
          const gridEl = $('[dx-data-grid]');
          gridEl.length && gridEl.dxDataGrid('instance').refresh();
        })
        .catch((err) => adpErrorHelper.handleError(err));
    },
    redirectToBpmRunner() {
      const confirmMessage = 'Are you sure to run this ruleset against configured dataset?';
      const successMessage = (response) =>
        `Background job #${response.data.jobId} running this ruleset has been scheduled`;
      const errorMessageFunc = (response) => response.message;
      return runByRecordId.call(this, confirmMessage, successMessage, errorMessageFunc);
    },
    runExternalCommand() {
      const confirmMessage = 'Are you sure to run this command?';
      const successMessageFunc = (response) =>
        `Background job #${response.data.jobId} running this command has been scheduled`;
      const errorMessageFunc = (response) => response.message;
      return runByRecordId.call(this, confirmMessage, successMessageFunc, errorMessageFunc);
    },
    downloadFile() {
      const injector = angular.element(document).injector();
      const adpMediaTypeHelper = injector.get('AdpMediaTypeHelper');

      if (this.row.exportType !== 'db') {
        const fileId = _.get(this.row, 'file._id');
        const fileItem = {id: fileId};

        adpMediaTypeHelper.downloadWithSaveDialog(fileItem);
      }
    },
  };
  return m;
};
