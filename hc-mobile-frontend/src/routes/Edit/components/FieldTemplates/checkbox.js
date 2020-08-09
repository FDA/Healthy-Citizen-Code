import React from 'react';
import {
  View,
  Text,
  Switch
} from 'react-native';
import Hint from '../FieldTemplates/hint';

function checkbox(locals) {
  if (locals.hidden) {
    return null;
  }

  const stylesheet = locals.stylesheet;
  let formGroupStyle = stylesheet.formGroup.normal;
  let controlLabelStyle = stylesheet.controlLabel.normal;
  let checkboxStyle = stylesheet.checkbox.normal;
  let helpBlockStyle = stylesheet.helpBlock.normal;
  let errorBlockStyle = stylesheet.errorBlock;

  if (locals.hasError) {
    formGroupStyle = stylesheet.formGroup.error;
    controlLabelStyle = stylesheet.controlLabel.error;
    checkboxStyle = stylesheet.checkbox.error;
    helpBlockStyle = stylesheet.helpBlock.error;
  }

  const label = locals.label ? <Text style={controlLabelStyle}>{locals.label}</Text> : null;
  const help = locals.help ? <Hint>{locals.help}</Hint> : null;
  const error = locals.hasError && locals.error ? <Text accessibilityLiveRegion="polite" style={errorBlockStyle}>{locals.error}</Text> : null;

  return (
    <View style={formGroupStyle}>
      {label}
      <View>
        <Switch
          accessibilityLabel={locals.label}
          ref="input"
          disabled={locals.disabled}
          onTintColor={locals.onTintColor}
          thumbTintColor={locals.thumbTintColor}
          tintColor={locals.tintColor}
          style={checkboxStyle}
          onValueChange={(value) => locals.onChange(value)}
          value={locals.value}
        />
        {help}
      </View>
      {error}
    </View>
  );
}

module.exports = checkbox;
