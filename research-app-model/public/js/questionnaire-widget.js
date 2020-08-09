;(function (window) {
  var hcWidgetUtils = window.hcWidgetUtils = {};
  hcWidgetUtils.iframeName = 'questionnaireFrame';

  hcWidgetUtils.forEach = function (object, cb) {
    // duck typing
    if ('length' in object) {
      object.forEach(cb);
    } else {
      for (var key in object) {
        if (object.hasOwnProperty(key)) {
          cb(object[key], key)
        }
      }
    }
  };

  hcWidgetUtils.map = function (object, cb) {
    var newArray = [];
    // duck typing
    if ('length' in object) {
      newArray = object.map(cb);
    } else {
      for (var key in object) {
        if (object.hasOwnProperty(key)) {
          newArray.push(cb(object[key], key));
        }
      }
    }

    return newArray;
  };

  hcWidgetUtils._get = function (object, path, defaultValue) {
    function getByPath(object, path) {
      var index = 0;
      var pathParts = path.split('.');
      var length = pathParts.length;

      while (object != null && index < length) {
        object = object[pathParts[index++]];
      }
      return (index && index == length) ? object : undefined;
    }

    if (typeof path !== 'string') {
      return undefined;
    }
    var result = object == null ? undefined : getByPath(object, path);
    return result === undefined ? defaultValue : result;
  };

  hcWidgetUtils.getQuestionnaireByFhirId = function (hcResearchUrl, fhirId) {
    return fetch(hcResearchUrl + '/questionnaire-by-fhirid/' + fhirId)
      .then(res => res.json())
      .then(json => {
        if (json.success === true && json.data) {
          return json.data;
        } else {
          return null;
        }
      })
      .catch(err => {
        return null;
      });
  };

  hcWidgetUtils.postQuestionnaireAnswers = function (hcResearchUrl, fhirId, answers) {
    return fetch(hcResearchUrl + '/questionnaire-by-fhirid/' + fhirId, {
      method: 'post',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(answers)
    })
      .then(res => res.json())
      .then(json => {
        return !!json.success;
      })
      .catch(err => {
        return false;
      });
  };

  hcWidgetUtils.updateIframeHeight = function () {
    // there is only one item:
    // 1) form when there is an unanswered questionnaire
    // 2) informing div when there is no unanswered questionnaire
    var iframe = document.querySelector('iframe[name="' + hcWidgetUtils.iframeName + '"]');
    iframe.style.height = iframe.contentWindow.document.body.childNodes[0].clientHeight + 'px';
  };

  hcWidgetUtils.setFieldValueFromFhir = function (question, form, fhirDataUrl, fhirId) {
    var fhirResourceUrl = hcWidgetUtils._get(question, 'fhirResource');
    var fhirFieldPath = hcWidgetUtils._get(question, 'fhirFieldPath');
    if (!fhirResourceUrl || !fhirFieldPath) {
      return;
    }

    fhirResourceUrl = fhirResourceUrl.replace(':id', fhirId);
    fetch(fhirDataUrl + fhirResourceUrl)
      .then(res => {
        if (res.status !== 200) {
          return false;
        }
        return res.json()
      })
      .then(json => {
        var fieldValue = hcWidgetUtils._get(json, fhirFieldPath);
        if (!fieldValue) {
          return false;
        }

        if (question.type === 'Checkbox') {
          var isChecked = fieldValue === true || fieldValue === 'true';
          form.querySelector('#' + question.fieldName).checked = isChecked;
        } else if (question.type === 'Text') {
          form.querySelector('#' + question.fieldName).value = fieldValue;
        }
      })
      .catch(err => {
        return false;
      });
  };
})(window);

;(function (window) {
  var htmlTagRex = /<\/?[\w\s="/.':;#-\/\?]+>/gi;
  window.hcWidgetDOM = hcWidgetDOM;

  function hcWidgetDOM(selector) {
    return new hcWidgetDOM.fn.init(selector);
  }

  hcWidgetDOM.isHTML = function (string) {
    return (string[0] === '<' && string[string.length - 1] === '>') ||
      htmlTagRex.test(string);
  };

  /**
   * Replace selected collection of DOM nodes with newContent
   * @param selector - instance of hcWidgetDOM or HTMLElement
   * @param context - search context, element to search in
   * @return {*}
   */
  // TODO: rename to hcWidgetDOM
  function init(selector, context) {
    var isString = typeof selector === "string";
    var nodes;

    if (!selector) {
      return this;
    }

    if (isString) {
      if (hcWidgetDOM.isHTML(selector)) {
        nodes = this.htmlToNode(selector).nodes;
      } else {
        nodes = (context || document).querySelectorAll(selector);
      }
    } else {
      nodes = [selector];
    }

    // TODO: resolve later, should be equal this and this.nodes
    this.nodes = nodes;
  }

  hcWidgetDOM.fn = hcWidgetDOM.prototype = {
    constructor: hcWidgetDOM,

    init: init,

    get: function (index) {
      return this.nodes[index];
    },

    forEach: function (cb, context) {
      var context = context || this;

      for (var i = 0; i < this.nodes.length; i++) {
        cb.call(context, this.nodes[i], i);
      }

      return this;
    },

    /**
     * Replace selected collection of DOM nodes with newContent
     * @param newContent - instance of hcWidgetDOM or HTMLElement
     * @return {*}
     */
    replaceWith: function (newContent) {
      var newContent = newContent.nodes ? newContent.nodes[0] : newContent;

      return this.forEach(function (nodeItem) {
        var parent = nodeItem.parentNode;
        parent.replaceChild(newContent, nodeItem);
      });
    },

    htmlToNode: function (htmlString) {
      var newNode;
      var template = document.createElement('template');
      template.innerHTML = htmlString;
      newNode = template.content.firstChild;

      return new this.constructor(newNode);
    },

    append: function (newContent) {
      var newContent = newContent.nodes ? newContent.nodes[0] : newContent;

      return this.forEach(function (nodeItem) {
        if (this.isRoot(nodeItem)) {
          nodeItem.body.appendChild(newContent);
        } else {
          nodeItem.appendChild(newContent);
        }
      });
    },

    remove: function () {
      this.forEach(function (node) {
        node.parentNode.removeChild(node);
      });
    },

    isRoot: function (node) {
      return !!node.body;
    }
  };

  init.prototype = hcWidgetDOM.fn;

})(window);

;(function (window) {
  window.HcWidgetForm = Form;
  var hcWidgetDOM = window.hcWidgetDOM;

  var hcWidgetUtils = window.hcWidgetUtils;

  // TODO: move form field code to separate module
  var interpolationRegex = /\${([^\}]+)}/g;
  var rowTemplate = [
    '<div>',
    '<label for="${fieldName}" class="label">',
    '<strong>${fullName}:</strong> ${question}',
    '</label>',
    '</div>'
  ].join('');

  function createChoiceField(fieldTemplate, question) {
    var tplString = fieldTemplate;
    var tpl = ['<div>'];

    hcWidgetUtils.forEach(question.options, function (optionText, index) {
      var radioBtnTpl = tplString.replace(interpolationRegex, function (_fullMatch, placeholder) {
        if (placeholder === 'cnt') {
          return index;
        }

        if (placeholder === 'optionText') {
          return optionText;
        }
        return _fullMatch;
      });
      tpl.push(radioBtnTpl);
    });

    tpl.push('</div>');
    return tpl.join('');
  }

  var fieldsTemplates;
  fieldsTemplates = {
    /**
     * @return {string}
     */
    'Checkbox': function () {
      return '<input type="checkbox" id="${fieldName}" name="${fieldName}"/>';
    },
    /**
     * @return {string}
     */
    'Text': function () {
      return '<input type="text" class="form-control" id="${fieldName}" name="${fieldName}"/>'
    },
    // TODO: refactor
    /**
     * @return {string}
     */
    'Single Choice': function (question) {
      var tplString = [
        '<input type="radio" name="${fieldName}" id="${fieldName}${cnt}" value="${optionText}">',
        '<label class="label-inline" for="${fieldName}${cnt}">${optionText}</label>'
      ].join('');

      return createChoiceField(tplString, question);
    },
    /**
     * @return {string}
     */
    'Multiple Choice': function (question) {
      var tplString = [
        '<input type="checkbox" id="${fieldName}${cnt}" name="${fieldName}" value="${optionText}">',
        '<label class="label-inline" for="${fieldName}${cnt}">${optionText}</label>'
      ].join('');

      return createChoiceField(tplString, question);
    }
  };

  function interpolate(question, tpl) {
    return tpl.replace(interpolationRegex, function (_fullMatch, keyName) {
      return question[keyName];
    })
  }

  var buttonTemplate = '<button type="submit">Submit</button>';

  function Form(data) {
    this.$el = hcWidgetDOM('<form>');
    this.el = this.$el.get(0);
    this.errors = [];

    this.init(data);
    this.bindEvents();
  }

  Form.prototype = {
    init: function (data) {
      var self = this;
      this.submitted = false;
      this.data = data;

      // TODO: refactor
      this.questions = hcWidgetUtils.map(data.questionnaire.questionnaireDefinition.questionnaire, function (question, key) {
        question.fieldName = key;
        return question;
      });

      var form = self.$el.get(0);
      hcWidgetUtils.forEach(this.questions, function (question) {
        var formField = self.createField(question);
        self.$el.append(formField);
        hcWidgetUtils.setFieldValueFromFhir(question, form, data.options.fhirDataUrl, data.options.fhirId);
      });

      this.submitBtn = hcWidgetDOM(buttonTemplate);
      this.$el.append(this.submitBtn);
    },

    reInit: function (questions) {
      this.$el.get(0).innerHTML = '';
      this.init(questions);
    },

    createField: function (question) {
      var rowTpl = interpolate(question, rowTemplate);
      var rowNode = hcWidgetDOM(rowTpl);

      var fieldTpl = interpolate(question, fieldsTemplates[question.type](question));
      var fieldNode = hcWidgetDOM(fieldTpl);

      return rowNode.append(fieldNode);
    },

    appendTo: function (node) {
      node.append(this.$el);
    },

    bindEvents: function () {
      var self = this;
      var form = this.$el.get(0);

      // TODO replace with hcWidgetDOM.on
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        self.submitted = true;

        if (self.isValid()) {
          self.removeErrors();
          self.setDisabled(false);
          self.submit();
        } else {
          self.setDisabled(true);
          self.removeErrors();
          self.displayErrors();

          hcWidgetUtils.updateIframeHeight();
        }
      });

      // TODO replace with hcWidgetDOM.on
      form.addEventListener('change', this.changeHandler.bind(this));
      form.addEventListener('keyup', this.changeHandler.bind(this));
    },

    changeHandler: function (e) {
      if (e.target.nodeName !== 'INPUT') return;
      if (!this.submitted) return;

      if (this.isValid()) {
        this.removeErrors();
        this.setDisabled(false);
      } else {
        this.setDisabled(true);
        this.removeErrors();
        this.displayErrors();
      }
      hcWidgetUtils.updateIframeHeight();
    },

    isValid: function () {
      var self = this;
      self.errors = [];

      hcWidgetUtils.forEach(this.questions, function (question) {
        var field, choiceSelector, valid = true;

        // TODO: use constants here
        // TODO: move logic to form field module
        if (question.type === 'Multiple Choice' || question.type === 'Single Choice') {
          choiceSelector = question.type === 'Single Choice' ?
            '[type="radio"]:checked' :
            '[type="checkbox"]:checked';

          field = self.getField(question.fieldName, choiceSelector);
          valid = field.length > 0;
        } else {
          field = self.getField(question.fieldName)[0];
          if (field.type === 'checkbox') {
            valid = field.checked;
          } else {
            valid = !!field.value;
          }
        }

        if (!valid) {
          self.errors.push(question.fieldName);
        }
      });

      return !self.errors.length;
    },

    getField: function (name, params) {
      var additionalParams = params || '';
      var selector = '[name="' + name + '"]' + additionalParams;
      return this.el.querySelectorAll(selector);
    },

    displayErrors: function () {
      var self = this;
      var errorTpl = '<div class="error-message">Field is required</div>';

      hcWidgetUtils.forEach(this.errors, function (fieldName) {
        var field = self.getField(fieldName)[0];
        var fieldWrapper = hcWidgetDOM(field.parentNode);
        var errorNode = hcWidgetDOM(errorTpl);
        fieldWrapper.append(errorNode);
      });
    },

    removeErrors: function () {
      var errorNodes = this.$el.get(0).querySelectorAll('.error-message');

      if (errorNodes.length) {
        // TODO replace with hcWidgetRemove
        Array.prototype.forEach.call(errorNodes, function (node) {
          node.parentNode.removeChild(node);
        });
      }
    },

    setDisabled: function (status) {
      var btn = this.submitBtn.get(0);
      btn.disabled = status;
    },

    submit: function () {
      this.setDisabled(true);
      var formData = this.serialize();
      console.log(formData);

      var that = this;
      var questionnaireAnswers = {
        data: {
          questionnaireId: this.data.questionnaire._id,
          answers: JSON.parse(formData)
        }
      };
      var hcResearchUrl = this.data.options.hcResearchUrl;
      var fhirId = this.data.options.fhirId;

      hcWidgetUtils.postQuestionnaireAnswers(hcResearchUrl, fhirId, questionnaireAnswers)
        .then(isSuccessful => {
          if (!isSuccessful) {
            alert('Unable to send answers');
          } else {
            hcWidgetUtils.getQuestionnaireByFhirId(hcResearchUrl, fhirId)
              .then(questionnaire => {
                if (!questionnaire) {
                  var message = document.createElement('div');
                  message.innerHTML = 'No questionnaire available';
                  message.style.color = 'white';
                  that.$el.replaceWith(message);

                  hcWidgetUtils.updateIframeHeight();
                } else {
                  that.reInit({
                    questionnaire: questionnaire,
                    options: that.data.options
                  });
                }
              })
          }
        })
        .catch(err => {
          alert('Unable to send answers');
        });
    },

    serialize: function () {
      var self = this;
      var formData = {};

      hcWidgetUtils.forEach(this.questions, function (question) {
        var field;
        var data;
        var choiceSelector;

        if (question.type === 'Multiple Choice' || question.type === 'Single Choice') {
          choiceSelector = question.type === 'Single Choice' ?
            '[type="radio"]:checked' :
            '[type="checkbox"]:checked';

          field = self.getField(question.fieldName, choiceSelector);
          data = [];
          for (var i = 0; i < field.length; i++) {
            data.push(field[i].value);
          }
        } else {
          field = self.getField(question.fieldName)[0];
          if (field.type === 'checkbox') {
            data = field.checked;
          } else {
            data = field.value;
          }
        }

        formData[question.fieldName] = data;
      });

      return JSON.stringify(formData);
    }
  }
})(window);

;(function (window) {
  window.createIframe = createIframe;
  var hcWidgetUtils = window.hcWidgetUtils;

  function createIframe(opts) {
    var opts = opts || {};
    var frame;
    var name = opts.name || guid();
    var style = opts.style || {border: 'none'};
    var src = opts.url;

    frame = document.createElement('iframe');
    frame.name = name;

    delete opts.style;
    delete opts.name;
    delete opts.url;
    delete opts.root;
    delete opts.onload;
    delete opts.onerror;

    var attributes = {
      frameBorder: 0,
      allowTransparency: true,
      allowFullscreen: true,
      scrolling: 'no'
    };

    if (attributes.width && isNumberLike(attributes.width)) {
      frame.width = attributes.width + 'px';
    }
    if (attributes.height && isNumberLike(attributes.height)) {
      frame.height = attributes.height + 'px';
    }

    delete attributes.height;
    delete attributes.width;

    hcWidgetUtils.forEach(attributes, function (attr, key) {
      frame.setAttribute(key, attr);
    });

    hcWidgetUtils.forEach(style, function (ruleValue, ruleName) {
      frame.style[ruleName] = ruleValue;
    });

    frame.src = src || 'javascript:false';

    return frame;
  }

  function guid() {
    return 'f' + (Math.random() * (1 << 30)).toString(16).replace('.', '');
  }

  function isNumberLike(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }
})(window);

;(function () {
  window.hcWidgetCss = hcWidgetCss;
  var hcWidgetUtils = window.hcWidgetUtils;

  var styles = {
    '*': [
      'margin: 0',
      'padding: 0',
      'box-sizing: border-box'
    ],
    'body': [
      'font-family: Arial,Helvetica,Sans-Serif',
      'font-size: 14px',
      'line-height: 16px'
    ],
    'form': [
      'background: white;',
      'padding: 8px;',
      'border-color: #ccc;'
    ],
    '.label': [
      'display: block',
      'margin-bottom: 6px',
      'line-height: 19px',
      'font-weight: 400',
      'font-size: 13px',
      'color: #000'
    ],
    '.label-inline': [
      'display: inline-block',
      'margin-left: 6px',
      'margin-right: 6px',
      'line-height: 19px',
      'font-weight: 400',
      'font-size: 13px',
      'color: #000'
    ],
    'input': [
      'margin-bottom: 6px'
    ],
    '.form-control': [
      'width: 100%',
      'display: block',
      'height: 32px',
      'line-height: 32px',
      'padding: 5px 10px',
      'border: 1px solid #ccc',
      'color: #000'
    ],
    'button': [
      'color: #fff',
      'background-color: #275b89',
      'border-color: #1f496d',
      'display: inline-block',
      'margin-top: 6px',
      'font-weight: 400',
      'text-align: center',
      'vertical-align: middle',
      'cursor: pointer',
      'border: 1px solid transparent',
      'padding: 0 22px',
      'font-size: 14px',
      'line-height: 29px',
      'border-radius: 2px;'
    ],
    '.error-message': [
      'color: #b94a48'
    ]
  };

  /**
   * @return {string}
   */
  function hcWidgetCss() {
    var css = [];

    hcWidgetUtils.forEach(styles, function (cssString, key) {
      css.push(key + '{' + cssString.join(';') + '}');
    });

    return '<style>' + css.join('') + '</style>'
  }
})();

;(function (window) {
  window.HcWidget = HcWidget;
  var hcWidgetDOM = window.hcWidgetDOM;
  var createIframe = window.createIframe;
  var HcWidgetForm = window.HcWidgetForm;
  var hcWidgetUtils = window.hcWidgetUtils;
  var hcWidgetCss = window.hcWidgetCss;
  var widgets = document.querySelectorAll('[data-hc-widget]');

  function HcWidget(node, options) {
    this.widgetNode = hcWidgetDOM(node);
    this.options = options;

    var that = this;
    hcWidgetUtils.getQuestionnaireByFhirId(options.hcResearchUrl, options.fhirId)
      .then(questionnaire => {
        if (!questionnaire) {
          that.createNoQuestionnaireMessage();
        } else {
          that.questionnaire = questionnaire;
          that.createIframe();
        }
      })
  }

  HcWidget.prototype = {
    createIframe: function () {
      var iframeOpts = {
        style: {
          width: '100%'
        },
        name: hcWidgetUtils.iframeName
      };

      this.$iframe = hcWidgetDOM(createIframe(iframeOpts));
      this.iframe = this.$iframe.get(0);

      this.iframe.addEventListener('load', this.onLoad.bind(this), true);

      this.widgetNode.replaceWith(this.iframe);
    },

    createNoQuestionnaireMessage: function () {
      var message = document.createElement('div');
      message.innerHTML = 'No questionnaire found';
      this.widgetNode.replaceWith(message);
    },

    setStyles: function () {
      var stylesTpl = hcWidgetCss();
      var stylesNode = hcWidgetDOM(stylesTpl);
      this.$iframeDocument.append(stylesNode);
    },

    createForm: function (data) {
      this.form = new HcWidgetForm(data);
      this.form.appendTo(this.$iframeDocument);
    },

    onLoad: function () {
      this.$iframeDocument = hcWidgetDOM(this.iframe.contentWindow.document);
      this.createForm({
        questionnaire: this.questionnaire,
        options: {
          hcResearchUrl: this.options.hcResearchUrl,
          fhirDataUrl: this.options.fhirDataUrl,
          fhirId: this.options.fhirId
        },
      });
      this.setStyles();
      hcWidgetUtils.updateIframeHeight();

      this.iframe.removeEventListener('load', this.onLoad);
    }
  };

  widgets.forEach(function (node) {
    new HcWidget(node, node.dataset);
  });
})(window);