import React from 'react';
import TCombForm from 'tcomb-form-native';
import GroupTemplate from '../GroupTemplate';

const {Nil, String} = TCombForm;
const {Component} = TCombForm.form;

class GroupFactory extends Component {
  getTransformer() {
    const {options} = this.props;

    if (options.transformer) {
      return options.transformer;
    }

    return GroupFactory.transformer;
  }

  getTemplate() {
    return GroupTemplate;
  }

  getLocals() {
    const locals = super.getLocals();
    const {options} = this.props;

    locals.onChangeNative = options.onChange;
    locals.underlineColorAndroid = (options.underlineColorAndroid || 'transparent');

    [
      'styles',
      'sections',
      'fieldId',
      'currentFieldSchema',
      'value',
      'typeData',
      'optionsData',
      'valueData',
      'orderArray',
      'isOpened',
      'type',
      'toggleGroup',
      'list',
      'children'
    ].forEach((name) => locals[name] = this.props.options[name]);

    return locals;
  }
}

export default GroupFactory;
