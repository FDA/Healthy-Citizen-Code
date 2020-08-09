import TCombForm from 'tcomb-form-native';
import DoublePickerTemplate from '../DoublePickerTemplate';

const {Nil} = TCombForm;
const {Select} = TCombForm.form;

class DoublePickerFactory extends Select {
  getTransformer() {
    const {options} = this.props;

    if (options.transformer) {
      return options.transformer;
    }

    return DoublePickerFactory.transformer(this.getNullOption());
  }

  getTemplate() {
    return DoublePickerTemplate;
  }

  getNullOption() {
    return this.props.options.nullOption || {value: null, text: '-'};
  }

  getLocals() {
    const locals = super.getLocals();

    [
      'help',
      'enabled',
      'mode',
      'prompt',
      'itemStyle',
      'options'
    ].forEach((name) => locals[name] = this.props.options[name]);

    return locals;
  }
}

DoublePickerFactory.transformer = nullOption => ({
  format: values => ([
    Nil.is(values[0]) && nullOption ? nullOption.value : values[0],
    Nil.is(values[1]) && nullOption ? nullOption.value : values[1]
  ]),
  parse: values => ([
    nullOption && nullOption.value === values[0] ? null : values[0],
    nullOption && nullOption.value === values[1] ? null : values[1]
  ])
});

export default DoublePickerFactory;
