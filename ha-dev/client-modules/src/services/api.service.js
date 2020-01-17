import { ApiClient } from 'hc-ui-util';
import { API_CONFIG } from '../config';

const isSuccess = (resp) => {
  const { data } = resp;
  return data.success && data.data.length;
};

function HaApiService(
  APP_CONFIG,
  $http,
  $q
) {
  function getDrugNdc(drugId) {
    const endpoint = `${APP_CONFIG.apiUrl}/drugNdc/${drugId}`;

    return $http.get(endpoint)
      .then((resp) => {
        const { data } = resp;
        if (!data.success) {
          throw { message: 'Medication not found.', type: 'DataRequestError' };
        }

        return data.data;
      });
  }

  function getDrugNdcs(profileId) {
    const endpoint = `${APP_CONFIG.apiUrl}/drugNdcs/${profileId}`;
    const apiClient = new ApiClient({
      HA_DEV_URL: API_CONFIG.HA_DEV_URL,
    });
    let medications = null;

    return $http.get(endpoint)
      .then((resp) => {
        if (!isSuccess(resp)) {
          throw { message: 'This profile doesn\'t have any drugs\n', type: 'DataRequestError' };
        }

        const { data } = resp;
        medications = data.data.map(({ ndc11, brandName }) => ({
          ndc: ndc11.split(', ')[0],
          brandName,
        }));

        return $q.all(medications.map(({ ndc }) => apiClient.getRxcuiByNdc(ndc)));
      })
      .then(rxcuis => medications.map((medication, index) => ({
        ...medication, rxcui: rxcuis[index],
      })));
  }

  function getAdverseEvents(drugId) {
    const endpoint = `${APP_CONFIG.apiUrl}/adverse-events-for-drug/${drugId}`;

    return $http.get(endpoint)
      .then((resp) => {
        if (!isSuccess(resp)) {
          throw { message: 'This drug doesn\'t have any associated adverse events\n', type: 'DataRequestError' };
        }

        return resp.data.data;
      });
  }

  function getReactions(drugId) {
    const promises = [
      getDrugNdc(drugId),
      getAdverseEvents(drugId),
    ];

    return Promise.all(promises)
      .then(([medication, events]) => {
        const { brandName } = medication;

        return {
          reactions: _countReactionsForEvents(events, brandName),
          medication,
        };
      });
  }

  function _countReactionsForEvents(events, brandName) {
    const reactions = {};

    events.forEach((event) => {
      reactions[brandName] = _countReactionForEvent(event);
    });

    return reactions;
  }

  function _countReactionForEvent(event) {
    const { reactions } = event;
    const reactionsCount = {};

    reactions.forEach((reaction) => {
      const { reactionMedDraPT } = reaction;
      reactionsCount[reactionMedDraPT] = reactionsCount[reactionMedDraPT] || 0;
      reactionsCount[reactionMedDraPT]++;
    });

    return reactionsCount;
  }

  return {
    getDrugNdc,
    getDrugNdcs,
    getAdverseEvents,
    getReactions,

    getRecalls(drugId) {
      const endpoint = `${APP_CONFIG.apiUrl}/recalls-for-drug/${drugId}`;

      return $http.get(endpoint)
        .then((resp) => {
          if (!isSuccess(resp)) {
            throw { message: 'This drug doesn\'t have any associated recalls\n', type: 'DataRequestError' };
          }

          return resp.data.data;
        });
    },

    getSpl(drugId) {
      const endpoint = `${APP_CONFIG.apiUrl}/spl-for-drug/${drugId}`;

      return $http.get(endpoint)
        .then((resp) => {
          const { data } = resp;
          const hasSections = !!data.data[0].sections;

          if (!(data.success && hasSections)) {
            throw {
              message: 'This drug doesn\'t have any associated SPL data.',
              type: 'DataRequestError',
            };
          }

          return data.data[0];
        });
    },
  };
}

export default ['HaApiService', HaApiService];
