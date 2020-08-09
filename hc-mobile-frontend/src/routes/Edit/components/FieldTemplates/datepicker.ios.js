import React, {PropTypes} from 'react';
import {
  Animated,
  View,
  TouchableOpacity,
  Text,
  DatePickerIOS
} from 'react-native';
import {
  Icon
} from 'native-base';
import Hint from '../FieldTemplates/hint';

const UIPICKER_HEIGHT = 216;

class CollapsibleDatePickerIOS extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isCollapsed: true,
      height: new Animated.Value(0)
    };
  }

  render() {
    const locals = this.props.locals;
    const stylesheet = locals.stylesheet;
    let touchableStyle = stylesheet.dateTouchable.normal;
    let datepickerStyle = stylesheet.datepicker.normal;
    let dateValueStyle = stylesheet.dateValue.normal;
    const dateCloseTouchableStyle = stylesheet.dateCloseTouchable;
    const dateCloseTouchableWithHelpStyle = stylesheet.dateCloseTouchableWithHelp;
    let dateCloseBtnStyle = stylesheet.dateCloseButton.normal;
    if (locals.hasError) {
      touchableStyle = stylesheet.dateTouchable.error;
      datepickerStyle = stylesheet.datepicker.error;
      dateValueStyle = stylesheet.dateValue.error;
      dateCloseBtnStyle = stylesheet.dateCloseButton.error;
    }
    let formattedValue = locals.value ? String(locals.value) : '-';
    let animation = Animated.timing;
    let animationConfig = {
      duration: 200
    };

    if (locals.config) {
      if (locals.config.format && locals.value) {
        formattedValue = locals.config.format(locals.value);
      }
      if (locals.config.animation) {
        animation = locals.config.animation;
      }
      if (locals.config.animationConfig) {
        animationConfig = locals.config.animationConfig;
      }
    }

    const closeBtn = locals.value ?
      <TouchableOpacity
        style={[dateCloseTouchableStyle, locals.help ? dateCloseTouchableWithHelpStyle : null]}
        onPress={() => {
          locals.onChange(null);
          animation(this.state.height, Object.assign({
            toValue: 0
          }, animationConfig)).start();
          this.setState({isCollapsed: true});
        }}
      >
        <Icon
          style={dateCloseBtnStyle}
          name='close-circle'
        />
      </TouchableOpacity>
      : null;

    const height = (this.state.isCollapsed) ? 0 : UIPICKER_HEIGHT;

    return (
      <View>
        <TouchableOpacity
          style={touchableStyle}
          onPress={() => {
            animation(this.state.height, Object.assign({
              toValue: (this.state.isCollapsed) ? UIPICKER_HEIGHT : 0
            }, animationConfig)).start();
            this.setState({isCollapsed: !this.state.isCollapsed});
            if (!locals.value && this.state.isCollapsed) {
              locals.onChange(new Date());
            }
          }}
        >
          <Text style={dateValueStyle}>
            {formattedValue}
          </Text>
        </TouchableOpacity>
        {closeBtn}
        <Animated.View style={{height: this.state.height, overflow: 'hidden'}}>
          <DatePickerIOS
            ref='input'
            accessibilityLabel={locals.label}
            date={locals.value || new Date()}
            maximumDate={locals.maximumDate}
            minimumDate={locals.minimumDate}
            minuteInterval={locals.minuteInterval}
            mode={locals.mode}
            onDateChange={(value) => locals.onChange(value)}
            timeZoneOffsetInMinutes={locals.timeZoneOffsetInMinutes}
            style={[datepickerStyle, {height: height}]}
          />
        </Animated.View>
      </View>
    );
  }
}

CollapsibleDatePickerIOS.propTypes = {
  locals: PropTypes.object.isRequired
};

function datepicker(locals) {
  if (locals.hidden) {
    return null;
  }

  const stylesheet = locals.stylesheet;
  let formGroupStyle = stylesheet.formGroup.normal;
  let controlLabelStyle = stylesheet.controlLabel.normal;
  let helpBlockStyle = stylesheet.helpBlock.normal;
  const errorBlockStyle = stylesheet.errorBlock;

  if (locals.hasError) {
    formGroupStyle = stylesheet.formGroup.error;
    controlLabelStyle = stylesheet.controlLabel.error;
    helpBlockStyle = stylesheet.helpBlock.error;
  }

  const label = locals.label ? <Text style={controlLabelStyle}>{locals.label}</Text> : null;
  const help = locals.help ? <Hint>{locals.help}</Hint> : null;
  const error = locals.hasError && locals.error ?
    <Text accessibilityLiveRegion="polite" style={errorBlockStyle}>{locals.error}</Text> : null;

  return (
    <View style={formGroupStyle}>
      {label}
      <View>
        <CollapsibleDatePickerIOS locals={locals}/>
        {help}
      </View>
      {error}
    </View>
  );
}

module.exports = datepicker;
