import TCombForm from 'tcomb-form-native';
import UploadTemplate from '../UploadTemplate';

const {Component} = TCombForm.form;

class UploadFactory extends Component {
  getTransformer() {
    const {options} = this.props;

    if (options.transformer) {
      return options.transformer;
    }

    return UploadFactory.transformer;
  }

  getTemplate() {
    return UploadTemplate;
  }

  getLocals() {
    const locals = super.getLocals();
    const {options} = this.props;

    locals.onChangeNative = options.onChange;
    locals.underlineColorAndroid = (options.underlineColorAndroid || 'transparent');

    [
      'fieldId',
      'formUrl',
      'navigation',
      'type',
      'filetype',
      'isSingleUpload'
    ].forEach((name) => locals[name] = this.props.options[name]);

    return locals;
  }
}

UploadFactory.transformer = {
  format: value => {
    return value;
  },
  parse: value => {
    return value;
  }
};

export default UploadFactory;
