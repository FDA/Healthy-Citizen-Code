import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  Picker
} from 'react-native';
import {
  Grid,
  Col
} from 'native-base';
import Hint from '../../FieldTemplates/hint';

class DoublePickerAndroid extends Component {
  constructor(props) {
    super(props);

    const {locals} = props;

    this.state = {
      // choose first option from both option arrays
      values: locals.value ? locals.value : [locals.options[0][0].value, locals.options[1][0].value]
    };

    this.updateValue = this.updateValue.bind(this);
  }

  updateValue(index, value) {
    const {locals} = this.props;
    const values = this.state.values.slice(0);

    values[index] = value;

    this.setState({
      values
    });

    locals.onChange(values);
  }

  render() {
    const {locals} = this.props;
    const {values} = this.state;

    const {stylesheet} = locals;
    let selectStyle = Object.assign({}, stylesheet.select.normal, stylesheet.pickerContainer.normal);

    if (locals.hasError) {
      selectStyle = stylesheet.select.error;
    }

    const firstOptions = locals.options[0].map(({value, text}) => <Picker.Item key={value} value={value} label={text} />);
    const secondOptions = locals.options[1].map(({value, text}) => <Picker.Item key={value} value={value} label={text} />);

    return (
      <Grid
        style={locals.help ? {marginRight: 40} : null}
      >
        <Col>
          <Picker
            accessibilityLabel={locals.label}
            ref="input"
            style={selectStyle}
            selectedValue={values[0]}
            onValueChange={value => this.updateValue(0, value)}
            help={locals.help}
            enabled={locals.enabled}
            mode={locals.mode}
            prompt={locals.prompt}
            itemStyle={locals.itemStyle}
          >
            {firstOptions}
          </Picker>
        </Col>
        <Col>
          <Picker
            accessibilityLabel={locals.label}
            ref="input2"
            style={selectStyle}
            selectedValue={values[1]}
            onValueChange={value => this.updateValue(1, value)}
            help={locals.help}
            enabled={locals.enabled}
            mode={locals.mode}
            prompt={locals.prompt}
            itemStyle={locals.itemStyle}
          >
            {secondOptions}
          </Picker>
        </Col>
      </Grid>
    );
  }
}

DoublePickerAndroid.propTypes = {
  locals: PropTypes.object.isRequired
};

function select(locals) {
  if (locals.hidden) {
    return null;
  }

  const stylesheet = locals.stylesheet;
  let formGroupStyle = stylesheet.formGroup.normal;
  let controlLabelStyle = stylesheet.controlLabel.normal;
  const errorBlockStyle = stylesheet.errorBlock;

  if (locals.hasError) {
    formGroupStyle = stylesheet.formGroup.error;
    controlLabelStyle = stylesheet.controlLabel.error;
  }

  const label = locals.label ? <Text style={controlLabelStyle}>{locals.label}</Text> : null;
  const help = locals.help ? <Hint>{locals.help}</Hint> : null;
  const error = locals.hasError && locals.error ? <Text accessibilityLiveRegion="polite" style={errorBlockStyle}>{locals.error}</Text> : null;

  return (
    <View style={formGroupStyle}>
      {label}
      <View>
        <DoublePickerAndroid
          locals={locals}
        />
        {help}
      </View>
      {error}
    </View>
  );
}

module.exports = select;
