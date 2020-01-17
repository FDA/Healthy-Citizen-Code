import TCombForm from 'tcomb-form-native';
import SinglePickerTemplate from '../SinglePickerTemplate';

const {Nil} = TCombForm;
const {Select} = TCombForm.form;

class SinglePickerFactory extends Select {
  getTransformer() {
    const {options} = this.props;

    if (options.transformer) {
      return options.transformer;
    }

    return SinglePickerFactory.transformer(this.getNullOption());
  }

  getTemplate() {
    return SinglePickerTemplate;
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

SinglePickerFactory.transformer = nullOption => ({
  format: values => ([
    Nil.is(values[0]) && nullOption ? nullOption.value : values[0]
  ]),
  parse: values => ([
    nullOption && nullOption.value === values[0] ? null : values[0]
  ])
});

export default SinglePickerFactory;
