import Config from '../config';
import logger from '../services/logger';
import {parseJSON, checkStatus, handleErrorRequest} from '../helpers/fetch';
import {getOption} from '../services/localStorage';

export default {
  getHeaders(withToken = false) {
    const headers = {
      ...Config.api.headers
    };

    const token = typeof withToken === 'string' ? withToken : getOption('token');

    if (withToken && token) {
      headers['Authorization'] = `JWT ${token}`;
    }

    return headers;
  },

  getNoErrorHandling(uri, params, withToken) {
    const headers = this.getHeaders(withToken);
    const queries = [];

    for (let paramName in params) {
      if (params.hasOwnProperty(paramName)) {
        const paramValue = params[paramName];

        queries.push(`${paramName}=${encodeURIComponent(paramValue)}`);
      }
    }

    const query = queries.length ? `?${queries.join('&')}` : '';

    // logger.debug(`GET ${Config.api.host}${uri}${query}`);
    // logger.debug('headers');
    // logger.debug(headers);

    return fetch(Config.api.host + uri + query, {
      headers: headers
    })
      .then(checkStatus)
      .then(parseJSON);
  },

  get(uri, params, withToken) {
    return this.getNoErrorHandling(uri, params, withToken)
      .catch(response => handleErrorRequest(response, () => this.get(uri, params, withToken)));
  },

  getText(uri, params, withToken) {
    const headers = this.getHeaders(withToken);
    const queries = [];

    for (let paramName in params) {
      if (params.hasOwnProperty(paramName)) {
        const paramValue = params[paramName];

        queries.push(`${paramName}=${encodeURIComponent(paramValue)}`);
      }
    }

    const query = queries.length ? `?${queries.join('&')}` : '';

    // logger.debug(`GET ${Config.api.host}${uri}${query}`);
    // logger.debug('headers');
    // logger.debug(headers);

    return fetch(Config.api.host + uri + query, {
      headers: headers
    })
      .then(res => {return res.text()})
  },

  postNoErrorHandling(uri, data, withToken) {
    const headers = this.getHeaders(withToken);

    // logger.debug(`POST ${Config.api.host}${uri}`);
    // logger.debug('headers');
    // logger.debug(headers);
    // logger.debug('data');
    // logger.debug(data);

    return fetch(Config.api.host + uri, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data)
    })
      .then(checkStatus)
      .then(parseJSON)
  },

  post(uri, data, withToken) {
    return this.postNoErrorHandling(uri, data, withToken)
      .catch(response => handleErrorRequest(response, () => this.post(uri, data, withToken)));
  },

  putNoErrorHandling(uri, data, withToken) {
    const headers = this.getHeaders(withToken);

    // logger.debug(`PUT ${Config.api.host}${uri}`);
    // logger.debug('headers');
    // logger.debug(headers);
    // logger.debug('data');
    // logger.debug(data);

    return fetch(Config.api.host + uri, {
      method: 'PUT',
      headers: headers,
      body: JSON.stringify(data)
    })
      .then(checkStatus)
      .then(parseJSON)
  },

  put(uri, data, withToken) {
    return this.putNoErrorHandling(uri, data, withToken)
      .catch(response => handleErrorRequest(response, () => this.put(uri, data, withToken)));
  },

  deleteNoErrorHandling(uri, data, withToken) {
    const headers = this.getHeaders(withToken);

    // logger.debug(`DELETE ${Config.api.host}${uri}`);
    // logger.debug('headers');
    // logger.debug(headers);
    // logger.debug('data');
    // logger.debug(data);

    return fetch(Config.api.host + uri, {
      method: 'DELETE',
      headers: headers,
      body: JSON.stringify(data)
    })
      .then(checkStatus)
      .then(parseJSON)
  },

  delete(uri, data, withToken) {
    return this.deleteNoErrorHandling(uri, data, withToken)
      .catch(response => handleErrorRequest(response, () => this.delete(uri, data, withToken)));
  }
}
