import React from 'react';
import {
  View,
  Text,
  DatePickerAndroid,
  TimePickerAndroid,
  TouchableNativeFeedback,
  TouchableOpacity
} from 'react-native';
import {
  Icon
} from 'native-base';
import Hint from '../FieldTemplates/hint';

const getTimePickerDate = () => {
  return new Promise(resolve => {
    TimePickerAndroid.open({is24Hour: true})
      .then(time => {
        if (time.action !== TimePickerAndroid.dismissedAction) {
          const newTime = new Date();
          newTime.setHours(time.hour);
          newTime.setMinutes(time.minute);
          resolve(newTime);
        }
        resolve();
      });
  });
};

const getDatePickerDate = (locals) => {
  let config = {
    date: locals.value ? new Date(locals.value) : new Date()
  };
  if (locals.minimumDate) {
    config.minDate = locals.minimumDate;
  }
  if (locals.maximumDate) {
    config.maxDate = locals.maximumDate;
  }
  return new Promise(resolve => {
    DatePickerAndroid.open(config)
      .then(function (date) {
        if (date.action !== DatePickerAndroid.dismissedAction) {
          const newDate = new Date(date.year, date.month, date.day);
          resolve(newDate);
        }
        resolve();
      });
  });
};

const datepicker = (locals) => {
  if (locals.hidden) {
    return null;
  }

  const stylesheet = locals.stylesheet;
  let formGroupStyle = stylesheet.formGroup.normal;
  let controlLabelStyle = stylesheet.controlLabel.normal;
  let datepickerStyle = stylesheet.datepicker.normal;
  let helpBlockStyle = stylesheet.helpBlock.normal;
  let errorBlockStyle = stylesheet.errorBlock;
  let dateValueStyle = stylesheet.dateValue.normal;
  const dateCloseTouchableStyle = stylesheet.dateCloseTouchable;
  const dateCloseTouchableWithHelpStyle = stylesheet.dateCloseTouchableWithHelp;
  let dateCloseBtnStyle = stylesheet.dateCloseButton.normal;

  if (locals.hasError) {
    formGroupStyle = stylesheet.formGroup.error;
    controlLabelStyle = stylesheet.controlLabel.error;
    datepickerStyle = stylesheet.datepicker.error;
    helpBlockStyle = stylesheet.helpBlock.error;
    dateValueStyle = stylesheet.dateValue.error;
    dateCloseBtnStyle = stylesheet.dateCloseButton.error;
  }

  // Setup the picker mode
  let datePickerMode = 'date';
  if (locals.mode === 'date' || locals.mode === 'time' || locals.mode === 'datetime') {
    datePickerMode = locals.mode;
  }

  /**
   * Check config locals for Android datepicker.
   * ``locals.config.background``: `TouchableNativeFeedback` background prop
   * ``locals.config.format``: Date format function
   */
  let formattedValue = locals.value ? String(locals.value) : '-';
  let background = TouchableNativeFeedback.SelectableBackground(); // eslint-disable-line new-cap
  if (locals.config) {
    if (locals.config.format && locals.value) {
      formattedValue = locals.config.format(locals.value);
    }
    if (locals.config.background) {
      background = locals.config.background;
    }
  }

  const label = locals.label ? <Text style={controlLabelStyle}>{locals.label}</Text> : null;
  const help = locals.help ? <Hint>{locals.help}</Hint> : null;
  const error = locals.hasError && locals.error ?
    <Text accessibilityLiveRegion='polite' style={errorBlockStyle}>{locals.error}</Text>
    : null;
  const closeBtn = locals.value ?
    <TouchableOpacity
      style={[dateCloseTouchableStyle, locals.help ? dateCloseTouchableWithHelpStyle : null]}
      onPress={() => {
        locals.onChange(null);
      }}
    >
      <Icon
        style={dateCloseBtnStyle}
        name='close-circle'
      />
    </TouchableOpacity>
    : null;

  return (
    <View style={formGroupStyle}>
      {label}
      <View>
        <TouchableNativeFeedback
          accessible={true}
          ref='input'
          background={background}
          onPress={function () {
            if (datePickerMode === 'time') {
              getTimePickerDate()
                .then(newTime => {
                  locals.onChange(newTime);
                });
            } else if (datePickerMode === 'date') {
              getDatePickerDate(locals)
                .then(newDate => {
                  locals.onChange(newDate);
                });
            } else if (datePickerMode === 'datetime') {
              getDatePickerDate(locals)
                .then(newDate => {
                  if (newDate) {
                    return Promise.all([
                      newDate,
                      getTimePickerDate()
                    ])
                  }
                })
                .then(([newDate, newTime]) => {
                  if (newTime) {
                    const newDateTime = new Date(newDate);
                    newDateTime.setHours(newTime.getHours());
                    newDateTime.setMinutes(newTime.getMinutes());
                    newDateTime.setSeconds(newTime.getSeconds());
                    locals.onChange(newDateTime);
                  }
                })
            }
          }}>
          <View>
            <Text style={dateValueStyle}>
              {formattedValue}
            </Text>
          </View>
        </TouchableNativeFeedback>
        {closeBtn}
        {help}
      </View>
      {error}
    </View>
  );
};

module.exports = datepicker;
