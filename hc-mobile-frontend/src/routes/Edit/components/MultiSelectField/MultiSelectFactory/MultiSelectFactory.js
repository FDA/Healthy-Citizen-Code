import TCombForm from 'tcomb-form-native';
import MultiSelectTemplate from '../MultiSelectTemplate';

const {Nil, String} = TCombForm;
const {Textbox} = TCombForm.form;

class MultiSelectFactory extends Textbox {
  getTransformer() {
    const {options} = this.props;

    if (options.transformer) {
      return options.transformer;
    }

    return MultiSelectFactory.transformer;
  }

  getTemplate() {
    return MultiSelectTemplate;
  }

  getLocals() {
    const locals = super.getLocals();
    const {options} = this.props;

    locals.placeholder = this.getPlaceholder();
    locals.onChangeNative = options.onChange;
    locals.keyboardType = this.getKeyboardType();
    locals.underlineColorAndroid = (options.underlineColorAndroid || 'transparent');

    [
      'help',
      'editable',
      'multiline',
      'onLayout',
      'onContentSizeChange',
      'placeholderTextColor',
      'numberOfLines',
      'clearButtonMode',
      'clearTextOnFocus',
      'fieldId',
      'enums',
      'openMultiSelectView'
    ].forEach((name) => locals[name] = this.props.options[name]);

    return locals;
  }
}

MultiSelectFactory.transformer = {
  format: value => Nil.is(value) ? null : value,
  parse: value => Nil.is(value) || !value.length ? null : value
};

export default MultiSelectFactory;
