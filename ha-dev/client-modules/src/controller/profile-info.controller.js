import { ApiClient } from 'hc-ui-util';
import { API_CONFIG } from '../config';

/** @ngInject */
function ProfileInfoController(
  $stateParams,
  HaApiService
) {
  const $ctrl = this;
  $ctrl.data = null;
  $ctrl.profileErrorMessage = false;

  const apiClient = new ApiClient({
    HA_DEV_URL: API_CONFIG.HA_DEV_URL,
  });

  HaApiService.getDrugNdcs($stateParams.id)
    .then(medications => apiClient.getRxClassesAndInteractionData(medications))
    .then((data) => {
      $ctrl.data = data;
    })
    .catch((err) => {
      if (err.type === 'DataRequestError') {
        console.log(err);
        $ctrl.profileErrorMessage = err.message;
      } else {
        console.err('Unhandled error: ', err);
        $ctrl.profileErrorMessage = 'This profile doesn\'t have any drugs\n';
      }
    });
}

export default ['ProfileInfoController', ProfileInfoController];
