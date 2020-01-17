;(function (window) {
  window.adpRenderLib = {
    getTemplate: getTemplate,
    getElementById: getElementById,
    getInterface: getInterface,
    getAppConfig: getAppConfig,
    fetch: makeRequest
  };

  /**
   * @description
   * Return compiled by lodash html template string.
   *
   * @param {String} template - ejs template
   * @param {Object} templateData
   *
   * @return {String} - compiled html string
   */
  function getTemplate(template, templateData) {
    var compiler = _.template(template);

    return compiler(templateData);
  }

  /**
   * @return application interface config
   */
  function getInterface() {
    return window.adpAppStore.appInterface();
  }

  /**
   * @return application interface config
   */
  function getAppConfig() {
    return angular.injector(['APP_MODEL_CONFIG']).get('APP_CONFIG');
  }

  /**
   ** @description
   * Wrapper function for window.fetch
   *
   * @param {String} endpoint
   * @return {Promise}
   */
  function makeRequest(endpoint) {
    var appConfig = getAppConfig();
    var requestUrl = [appConfig.apiUrl, endpoint].join('/');
    var interfaceConfig = this.getInterface();
    var token = window.localStorage.getItem(interfaceConfig.name + '.token');
    var config = {headers: {}};

    if (token) {
      config['headers']['Authorization'] = 'JWT ' + token;
    }

    return fetch(requestUrl, config);
  }

  /**
   * @description
   * Get element by id. Return adpElement instance.
   *
   * @param {String} id is not a selector, id hash will throw error
   * @return {Element}
   */
  function getElementById(id) {
    return adpElement.fn.init(id)
  }

  /**
   * @description
   * Represents DOM element. Provides fluid API to manipulate with DOM elements.
   *
   * @constructor
   * @param {String} id is not a selector, id hash will throw error
   */
  function adpElement(id) {
    this.el = document.getElementById(id);
  }

  adpElement.fn = adpElement.prototype = {
    constructor: adpElement,

    /**
     * @description
     * The real initialization of adpElement.
     *
     * @param {String} id is not a selector, id hash will throw error
     */
    init: function (id) {
      if (!id) {
        return this;
      }

      return new this.constructor(id);
    },

    /**
     * @description
     * Set text to element of adpElement instance.
     *
     * @param value
     * @return {adpElement}
     */
    setValue: function (value) {
      this.el.innerText = value;
      return this;
    }
  }
})(window);