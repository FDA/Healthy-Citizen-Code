import React, {Component, PropTypes} from 'react';
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
      values: locals.value
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
            selectedValue={locals.value[0]}
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
            selectedValue={locals.value[1]}
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
