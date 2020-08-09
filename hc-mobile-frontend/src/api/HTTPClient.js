import Config from '../config';
import logger from '../services/logger';
import {parseJSON, checkStatus, handleErrorRequest} from '../helpers/fetch';
import {getOption} from '../services/localStorage';

const getHeaders = (withToken = false) => {
  const headers = {
    ...Config.api.headers
  };

  const token = typeof withToken === 'string' ? withToken : getOption('token');

  if (withToken && token) {
    headers['Authorization'] = `JWT ${token}`;
  }

  return headers;
};

export default {
  get(uri, params, withToken) {
    const headers = getHeaders(withToken);
    const queries = [];

    for (let paramName in params) {
      if (params.hasOwnProperty(paramName)) {
        const paramValue = params[paramName];

        queries.push(`${paramName}=${encodeURIComponent(paramValue)}`);
      }
    }

    const query = queries.length ? `?${queries.join('&')}` : '';

    logger.debug(`GET ${Config.api.host}${uri}${query}`);
    logger.debug('headers');
    logger.debug(headers);

    return fetch(Config.api.host + uri + query, {
      headers: headers
    })
      .then(checkStatus)
      .then(parseJSON)
      .catch(response => handleErrorRequest(response, () => this.get(uri, params, withToken)));
  },

  post(uri, data, withToken) {
    const headers = getHeaders(withToken);

    logger.debug(`POST ${Config.api.host}${uri}`);
    logger.debug('headers');
    logger.debug(headers);
    logger.debug('data');
    logger.debug(data);

    return fetch(Config.api.host + uri, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data)
    })
      .then(checkStatus)
      .then(parseJSON)
      .catch(response => handleErrorRequest(response, () => this.post(uri, data, withToken)));
  },

  put(uri, data, withToken) {
    const headers = getHeaders(withToken);

    logger.debug(`PUT ${Config.api.host}${uri}`);
    logger.debug('headers');
    logger.debug(headers);
    logger.debug('data');
    logger.debug(data);

    return fetch(Config.api.host + uri, {
      method: 'PUT',
      headers: headers,
      body: JSON.stringify(data)
    })
      .then(checkStatus)
      .then(parseJSON)
      .catch(response => handleErrorRequest(response, () => this.put(uri, data, withToken)));
  },

  delete(uri, data, withToken) {
    const headers = getHeaders(withToken);

    logger.debug(`DELETE ${Config.api.host}${uri}`);
    logger.debug('headers');
    logger.debug(headers);
    logger.debug('data');
    logger.debug(data);

    return fetch(Config.api.host + uri, {
      method: 'DELETE',
      headers: headers,
      body: JSON.stringify(data)
    })
      .then(checkStatus)
      .then(parseJSON)
      .catch(response => handleErrorRequest(response, () => this.delete(uri, data, withToken)));
  }
}
