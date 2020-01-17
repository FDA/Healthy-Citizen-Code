function getSchemas() {
  const APP_MODEL = window.adpAppStore.appModel();

  return {
    recalls: _.get(APP_MODEL, 'recallsRes'),
    adverseEvents: _.get(APP_MODEL, 'aesFaers'),
  };
}
/** @ngInject */
function DrugInfoController(
  $stateParams,
  HaApiService
) {
  const $ctrl = this;

  $ctrl.loading = {
    drugInfo: true,
    recalls: true,
    ae: true,
    spl: true,
  };

  $ctrl.errors = {
    drugInfo: null,
    recalls: null,
    ae: null,
    spl: null,
  };

  $ctrl.schemas = getSchemas();

  $ctrl.recalls = null;
  $ctrl.medication = null;
  $ctrl.reactions = null;
  $ctrl.ae = null;
  $ctrl.spl = null;

  const handleError = (err, name, defaultMessage) => {
    if (err.type === 'DataRequestError') {
      console.log(err);
      $ctrl.errors[name] = err.message;
    } else {
      console.error('Unexpected error: ', err);
      $ctrl.errors[name] = defaultMessage;
    }
  };

  $ctrl.fetchReactions = function () {
    if (!$ctrl.loading.drugInfo) {
      return;
    }

    HaApiService.getReactions($stateParams.id)
      .then(({ reactions, medication }) => {
        $ctrl.reactions = reactions;
        $ctrl.medication = medication;
      })
      .catch(err => handleError(err, 'drugInfo', 'Medication not found.'))
      .finally(() => {
        $ctrl.loading.drugInfo = false;
      });
  };

  $ctrl.fetchRecalls = function () {
    if (!$ctrl.loading.recalls) {
      return;
    }

    HaApiService.getRecalls($stateParams.id)
      .then((recalls) => {
        $ctrl.recalls = recalls;
      })
      .catch(err => handleError(err, 'recalls', 'Recalls not found for associated medication.'))
      .finally(() => {
        $ctrl.loading.recalls = false;
      });
  };

  $ctrl.fetchAdverseEvents = function () {
    if (!$ctrl.loading.ae) {
      return;
    }

    HaApiService.getAdverseEvents($stateParams.id)
      .then((events) => {
        $ctrl.ae = events;
      })
      .catch(err => handleError(err, 'ae', 'Adverse Events not found for associated medication.'))
      .finally(() => {
        $ctrl.loading.ae = false;
      });
  };

  $ctrl.fetchSpl = function () {
    if (!$ctrl.loading.spl) {
      return;
    }

    HaApiService.getSpl($stateParams.id)
      .then((spl) => {
        $ctrl.spl = spl;
      })
      .catch(err => handleError(err, 'spl', 'Spl data not found for associated medication.'))
      .finally(() => {
        $ctrl.loading.spl = false;
      });
  };
}

export default ['DrugInfoController', DrugInfoController];
