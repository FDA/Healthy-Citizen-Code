import Config from '../../../config';
import Client from '../../../api/HTTPClient';
import _ from 'lodash';

const makeRequest = (endpoint) => {
  return fetch(endpoint, {headers: Client.getHeaders()});
};

/**
 * Config wrapper. Wraps similar fields from mobile and web apps.
 * @returns {{apiUrl: *}}
 */
const getAppConfig = () => {
  return {
    apiUrl: Config.api.host
  };
};

class FormField {
  constructor(formContext, fieldId) {
    this.formContext = formContext;
    this.fieldId = fieldId;
  }
  setValue(value) {
    this.formContext.onChangeValue(this.fieldId, value);
  }
}
/**
 * Requires form to be bound as context.
 * @param fieldId
 */
const getElementById = (fieldId) => {
  return new FormField(this, fieldId);
};

// const getInterface = () => {
//
// };

const getTemplate = (template, templateData) => {
  const compiler = _.template(template);
  return compiler(templateData);
};

const adpRenderLib = {
  getTemplate,
  getElementById,
  // getInterface,
  getAppConfig,
  fetch: makeRequest
};

global.adpRenderLib = adpRenderLib;

module.exports = adpRenderLib;