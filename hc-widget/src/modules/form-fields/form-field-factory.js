import $ from '../../lib/dom';
import {toCamelCase} from '../../lib/utils';
import {updateIframeHeight} from '../../lib/utils';

import checkboxField from './checkbox/checkbox';
import textField from './text/text';
import singleChoiceField from './single-choice/single-choice';
import multipleChoiceField from './multiple-choice/multiple-choice';
import scale10Field from './scale10/scale10';

const fieldMap = {
  'checkbox': checkboxField,
  'text': textField,
  'string': textField,
  'singleChoice': singleChoiceField,
  'multipleChoice': multipleChoiceField,
  'scale10': scale10Field
};

// order is important
const validators = {
  'required': value => !!value
};

const formField = {
  create(question, {appendTo, readonly, value}) {
    const template = this.fieldTemplate(question);
    this.$el = $(template);
    this.el = this.$el.get(0);

    this.name = question.fieldName;
    this.question = question.question;
    this.errors = [];

    this.validationRules = Object.keys(validators).filter(v => v in question);
    this.setValue(value);
    this.setReadonly(readonly);

    appendTo.append(this.$el);
  },

  isValid() {
    let isValid = true;
    this.errors = [];

    for (let i = 0; i < this.validationRules.length; i++) {
      let ruleName = this.validationRules[i];
      let validator = validators[ruleName];
      isValid = validator(this.value());
      if (!isValid) {
        this.errors.push(ruleName);
        return false;
      }
    }

    return isValid;
  },

  setReadonly(status) {
    const field = this.el.querySelector('input');
    field.readOnly = status;
    this.readonly = status;
  },

  setValue(value) {
    const field = this.el.querySelector('input');
    field.value = value;
  },

  _setMultiValue(value) {
    if (!value) return;

    value.forEach(v => {
      let field = this.el.querySelector(`[value="${v}"]`);
      field.checked = true;
    });
  },

  showError() {
    this.errors.forEach(name => {
      const errorNode = $(`[data-error-name=${name}]`, this.el).get(0);
      errorNode.style.display = 'block';
    });

    updateIframeHeight();
  },

  hideError() {
    const errorNodes = $('[data-error-name]', this.el);
    errorNodes.forEach(node => node.style.display = 'none');
    updateIframeHeight();
  }
};

export default function formFieldFactory(question, opts) {
  const fieldTypeObj = fieldMap[toCamelCase(question.type)];
  const field = Object.assign(Object.create(formField), fieldTypeObj);

  field.create(question, opts);

  return field;
}
