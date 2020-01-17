import TCombForm from 'tcomb-form-native';
import BarcodeTemplate from '../BarcodeTemplate';

const {Component} = TCombForm.form;

class BarcodeFactory extends Component {
  getTransformer() {
    const {options} = this.props;

    if (options.transformer) {
      return options.transformer;
    }

    return BarcodeFactory.transformer;
  }

  getTemplate() {
    return BarcodeTemplate;
  }

  getLocals() {
    const locals = super.getLocals();
    const {options} = this.props;

    locals.underlineColorAndroid = (options.underlineColorAndroid || 'transparent');

    [
      'fieldId',
      'onChangeValue',
      'navigation',
      'type',
    ].forEach((name) => locals[name] = this.props.options[name]);

    return locals;
  }
}

BarcodeFactory.transformer = {
  format: value => {
    return value;
  },
  parse: value => {
    return value;
  }
};

export default BarcodeFactory;
