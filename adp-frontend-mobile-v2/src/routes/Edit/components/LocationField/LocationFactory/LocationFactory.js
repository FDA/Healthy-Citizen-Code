import TCombForm from 'tcomb-form-native';
import LocationTemplate from '../LocationTemplate';

const {Component} = TCombForm.form;

class LocationFactory extends Component {
  getTransformer() {
    const {options} = this.props;

    if (options.transformer) {
      return options.transformer;
    }

    return LocationFactory.transformer;
  }

  getTemplate() {
    return LocationTemplate;
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

LocationFactory.transformer = {
  format: value => {
    return value;
  },
  parse: value => {
    return value;
  }
};

export default LocationFactory;
