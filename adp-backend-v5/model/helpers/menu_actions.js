/**
 * MenuActions are called when a user clicks a menu item linked to a custom action
 *
 *  Receives click event as only parameter
 */

module.exports = function () {
  const m = {};

  m.updateTrinoSchema = () => {
    // eslint-disable-next-line no-undef
    const injector = angular.element(document).injector();
    const $http = injector.get('$http');
    const { apiUrl } = injector.get('APP_CONFIG');
    const { handleError } = injector.get('ErrorHelpers');
    const { notifySuccess, notifyError } = injector.get('AdpNotificationService');

    $http
      .post(`${apiUrl}/update-trino-schema`)
      .then(({ data }) => {
        if (data.success) {
          return notifySuccess(`Successfully updated Trino schemas`);
        }
        notifyError(data.message || 'Unable to update Trino schemas');
      })
      .catch((error) => handleError(error, 'Unable to update Trino schemas'));
  };

  return m;
};
