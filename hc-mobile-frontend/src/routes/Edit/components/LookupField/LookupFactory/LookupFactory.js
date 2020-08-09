import TCombForm from 'tcomb-form-native';
import LookupTemplate from '../LookupTemplate';

const {Nil, String} = TCombForm;
const {Textbox} = TCombForm.form;

class LookupFactory extends Textbox {
  getTransformer() {
    const {options} = this.props;

    if (options.transformer) {
      return options.transformer;
    }

    return LookupFactory.transformer;
  }

  getTemplate() {
    return LookupTemplate;
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
      'lookupId',
      'openLookupView'
    ].forEach((name) => locals[name] = this.props.options[name]);

    return locals;
  }
}

LookupFactory.transformer = {
  format: value => Nil.is(value) || Nil.is(value.id) || Nil.is(value.label) ? null : value,
  parse: value =>
    Nil.is(value) ||
    Nil.is(value.id) || (String.is(value.id) && value.id.trim() === '') ||
    Nil.is(value.label) || (String.is(value.label) && value.label.trim() === '')
      ? null
      : value
};

export default LookupFactory;
