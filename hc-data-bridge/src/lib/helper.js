const _ = require('lodash');
const uuidv4 = require('uuid/v4');

module.exports = {
  /**
   * Replace placeholders '%placeholder%' with corresponding value
   * @param json object with placeholders
   * @param replacements object which contains
   * key = 'placeholder'
   * value = value to change '%placeholder%' with
   */
  replaceParams (json, replacements) {
    let jsonString = JSON.stringify(json);
    jsonString = jsonString.replace(/%(\w+)%/g, (placeholder, p1) =>
      // p1 - first group
      replacements[p1] || placeholder);
    return JSON.parse(jsonString);
  },
  buildUrl (base, params) {
    if (_.isEmpty(params)) {
      return base;
    }
    let url = `${base}?`;
    _.forOwn(params, (value, key) => {
      if (Array.isArray(params[key])) {
        params[key].forEach(val => url += `${key}=${val}&`);
      } else {
        url += `${key}=${params[key]}&`;
      }
    });
    // Cut last '&' char
    return url.substring(0, url.length - 1);
  },
  urnUuid () {
    return `urn:uuid:${uuidv4()}`;
  },
  /**
   * Gets url for extension. Example of extension:
   * {
   *   "url": "https://hc-data-bridge-stage.conceptant.com/phis.myDevices.productId",
   *   "valueString": "some_value"
   * }
   * @param path
   * @returns {string}
   */
  getExtensionUrl (path) {
    return `https://hc-data-bridge-stage.conceptant.com/${path}`;
  },
  buildStringExtension (path, valueString) {
    return {
      url: this.getExtensionUrl(path),
      valueString,
    };
  },

  // Could be used from https://mathiasbynens.be/demo/url-regex
  isValidUrl (url) {
    if (!url) {
      return false;
    }
    return new RegExp('^(https?:\/\/)?(.+)\.(.+)').test(url);
  },
  isValidMongoDbUrl (url) {
    if (!url) {
      return false;
    }
    // "mongodb://localhost:27017/hc-stage-test"
    return new RegExp('^mongodb:\/\/(.+)\/(.+)').test(url);
  },
};
