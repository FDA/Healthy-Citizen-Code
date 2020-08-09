import {
  Alert
} from 'react-native';
import logger from '../services/logger';
import Config from '../config';

export const checkStatus = response => {
  logger.debug(response);

  if (
    response.status < 200 ||
    response.status >= 500 ||
    !response.headers.get('content-type') ||
    response.headers.get('content-type').toLowerCase().indexOf('application/json') < 0
  ) {
    const error = new Error(response.statusText || (response.status >= 500 ? 'Internal server error.' : null));
    error.response = response || null;

    return Promise.reject(error);
  }
  if (response.status >= 400 && response.status < 500) {
    return response.json()
      .then(jsonResponse => {
        logger.debug(jsonResponse);

        const error = new Error(jsonResponse.message || response.statusText);
        error.response = response || null;
        error.jsonResponse = jsonResponse || null;

        return Promise.reject(error);
      });
  }

  return Promise.resolve(response);
};

export const parseJSON = response => (
  response.json()
    .then(jsonResponse => {
      logger.debug(jsonResponse);

      if (!jsonResponse.success) {
        const error = new Error(jsonResponse.message || 'Incorrect response success.');
        error.response = response || null;
        error.jsonResponse = jsonResponse || null;

        return Promise.reject(error);
      }

      return Promise.resolve(jsonResponse || null);
    })
);

export const handleErrorRequest = (error, retry) => (
  new Promise((resolve, reject) => {
    logger.debug(error);

    const errorMessage = error.message || 'Request error.';

    if (!error.jsonResponse || typeof error.jsonResponse.success === 'undefined') {
      Alert.alert(
        'Error',
        errorMessage,
        [
          {
            text: 'Cancel',
            onPress: () => reject(error)
          },
          {
            text: 'Retry',
            onPress: () => resolve(retry())
          }
        ],
        {
          cancelable: false
        }
      );
    } else {
      Alert.alert(
        'Error',
        errorMessage,
        [
          {
            text: 'Ok',
            onPress: () => reject(error)
          }
        ],
        {
          cancelable: false
        }
      );
    }
  })
);

export const getAbsoluteUrl = url => url.charAt(0) === '/' ? Config.api.host + url : url;
