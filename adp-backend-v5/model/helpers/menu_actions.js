const { getFeModule } = require("./util");
/**
 * MenuActions are called when a user clicks a menu item linked to a custom action
 *
 *  Receives click event as only parameter
 */

module.exports = function () {
  const m = {};

  m.updateTrinoSchema = () => {
    // eslint-disable-next-line no-undef
    const fe = getFeModule(['$http', 'APP_CONFIG', 'ErrorHelpers', 'AdpNotificationService']);
    const {apiUrl} = fe.APP_CONFIG;
    const {handleError} = fe.ErrorHelpers;
    const {notifySuccess, notifyError} = fe.AdpNotificationService;

    fe.$http
      .post(`${apiUrl}/update-trino-schema`)
      .then(({data}) => {
        if (data.success) {
          return notifySuccess(`Successfully updated Trino schemas`);
        }
        notifyError(data.message || 'Unable to update Trino schemas');
      })
      .catch((error) => handleError(error, 'Unable to update Trino schemas'));
  };

  m.userLogout = () => {
    const fe = getFeModule(['AdpModalService', 'AdpSessionService']);
    const options = {
      message: 'Are you sure you want to logout?',
      actionType: 'confirm-logout',
    };

    // eslint-disable-next-line promise/catch-or-return
    fe.AdpModalService.confirm(options)
      .then(fe.AdpSessionService.logout);
  }

  m.resetUi = () => {
    const fe = getFeModule(['AdpModalService']);
    const options = {
      message: 'This will reset your current frontend setting to default and logout you from the system. Are you sure you want to proceed?',
      actionType: 'confirm-ui-reset',
    };

    // eslint-disable-next-line promise/catch-or-return
    fe.AdpModalService.confirm(options)
      .then(() => {
        // eslint-disable-next-line no-undef
        lsService.clear();
        // eslint-disable-next-line no-undef
        window.location.reload(true);
      });
  }

  m.toggleFullscreen = () => {
    const fe = getFeModule(['$rootScope']);

    fe.$rootScope.isFullscreen = !fe.$rootScope.isFullscreen;
  }

  return m;
};
