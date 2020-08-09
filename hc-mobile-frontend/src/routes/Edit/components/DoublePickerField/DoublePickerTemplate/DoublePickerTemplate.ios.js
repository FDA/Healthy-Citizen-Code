import React, {Component, PropTypes} from 'react';
import {
  Animated,
  View,
  TouchableOpacity,
  Text,
  Picker
} from 'react-native';
import {
  Grid,
  Col
} from 'native-base';
import Hint from '../../FieldTemplates/hint';

const UIPICKER_HEIGHT = 216;

class DoublePickerIOS extends Component {

  constructor(props) {
    super(props);

    const {locals} = props;

    this.state = {
      isCollapsed: true,
      height: new Animated.Value(0),
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
    let pickerContainer = stylesheet.pickerContainer.normal;
    let pickerContainerOpen = stylesheet.pickerContainer.open;
    let selectStyle = stylesheet.select.normal;
    let touchableStyle = stylesheet.pickerTouchable.normal;
    let touchableStyleActive = stylesheet.pickerTouchable.active;
    let pickerValue = stylesheet.pickerValue.normal;
    if (locals.hasError) {
      selectStyle = stylesheet.select.error;
      touchableStyle = stylesheet.pickerTouchable.error;
      pickerValue = stylesheet.pickerValue.error;
    }

    let animation = Animated.timing;
    let animationConfig = {
      duration: 200
    };
    if (locals.config) {
      if (locals.config.animation) {
        animation = locals.config.animation;
      }
      if (locals.config.animationConfig) {
        animationConfig = locals.config.animationConfig;
      }
    }

    const firstOptions = locals.options[0].map(({value, text}) => <Picker.Item key={value} value={value} label={text} />);
    const secondOptions = locals.options[1].map(({value, text}) => <Picker.Item key={value} value={value} label={text} />);
    const selectedFirstOption = locals.options[0].find(option => option.value === locals.value[0]);
    const selectedSecondOption = locals.options[1].find(option => option.value === locals.value[1]);

    return (
      <View style={[pickerContainer, (!this.state.isCollapsed) ? pickerContainerOpen : {}]}>
        <TouchableOpacity style={[touchableStyle, this.state.isCollapsed ? {} : touchableStyleActive]}
          onPress={() => {
            animation(this.state.height, Object.assign({
              toValue: (this.state.isCollapsed) ? UIPICKER_HEIGHT : 0
            }, animationConfig)).start();
            this.setState({isCollapsed: !this.state.isCollapsed});
          }}
        >
          <Text style={pickerValue}>
            {
              selectedFirstOption && selectedFirstOption.text
                ? selectedFirstOption.text
                : '-'
            } {
              selectedSecondOption && selectedSecondOption.text
                ? selectedSecondOption.text
                : '-'
            }
          </Text>
        </TouchableOpacity>
        <Animated.View style={{height: this.state.height, overflow: 'hidden'}}>
          <Grid>
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
        </Animated.View>
      </View>
    );
  }
}

DoublePickerIOS.propTypes = {
  locals: PropTypes.object.isRequired
};

function select(locals) {
  if (locals.hidden) {
    return null;
  }

  const stylesheet = locals.stylesheet;
  let formGroupStyle = stylesheet.formGroup.normal;
  let controlLabelStyle = stylesheet.controlLabel.normal;
  let errorBlockStyle = stylesheet.errorBlock;

  if (locals.hasError) {
    formGroupStyle = stylesheet.formGroup.error;
    controlLabelStyle = stylesheet.controlLabel.error;
  }

  const label = locals.label ? <Text style={controlLabelStyle}>{locals.label}</Text> : null;
  const help = locals.help ? <Hint>{locals.help}</Hint> : null;
  const error = locals.hasError && locals.error ?
    <Text accessibilityLiveRegion="polite" style={errorBlockStyle}>{locals.error}</Text> : null;

  return (
    <View style={formGroupStyle}>
      {label}
      <View>
        <DoublePickerIOS locals={locals}/>
        {help}
      </View>
      {error}
    </View>
  );
}

module.exports = select;
