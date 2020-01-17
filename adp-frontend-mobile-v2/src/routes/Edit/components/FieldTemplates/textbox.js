import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  Dimensions
} from 'react-native';
import Hint from '../FieldTemplates/hint';

const textbox = (locals) => {
  if (locals.hidden) {
    return null;
  }

  const stylesheet = locals.stylesheet;
  let formGroupStyle = stylesheet.formGroup.normal;
  let controlLabelStyle = stylesheet.controlLabel.normal;
  let textboxStyle = stylesheet.textbox.normal;
  let textboxWithHelpStyle = stylesheet.textboxWithHelp;
  let textboxViewStyle = stylesheet.textboxView.normal;
  const errorBlockStyle = stylesheet.errorBlock;

  if (locals.hasError) {
    formGroupStyle = stylesheet.formGroup.error;
    controlLabelStyle = stylesheet.controlLabel.error;
    textboxStyle = stylesheet.textbox.error;
    textboxViewStyle = stylesheet.textboxView.error;
  }

  if (locals.editable === false) {
    textboxStyle = stylesheet.textbox.notEditable;
    textboxViewStyle = stylesheet.textboxView.notEditable;
  }
  textboxStyle = Object.assign({}, textboxStyle);

  const label = locals.label ? <Text style={controlLabelStyle}>{locals.label}</Text> : null;
  const help = locals.help ? <Hint>{locals.help}</Hint> : null;
  const error = locals.hasError && locals.error ? <Text accessibilityLiveRegion='polite' style={errorBlockStyle}>{locals.error}</Text> : null;

  return (
    <View style={formGroupStyle}>
      {label}
      <View style={[textboxViewStyle]}>
        <TextInput
          accessibilityLabel={locals.label}
          ref='input'
          autoCapitalize={locals.autoCapitalize}
          autoCorrect={locals.autoCorrect}
          autoFocus={locals.autoFocus}
          blurOnSubmit={locals.blurOnSubmit}
          editable={locals.editable}
          keyboardType={locals.keyboardType}
          maxLength={locals.maxLength}
          multiline={locals.multiline}
          onBlur={locals.onBlur}
          onEndEditing={locals.onEndEditing}
          onFocus={locals.onFocus}
          onLayout={locals.onLayout}
          onSelectionChange={locals.onSelectionChange}
          onSubmitEditing={locals.onSubmitEditing}
          onContentSizeChange={locals.onContentSizeChange}
          placeholderTextColor={locals.placeholderTextColor}
          secureTextEntry={locals.secureTextEntry}
          selectTextOnFocus={locals.selectTextOnFocus}
          selectionColor={locals.selectionColor}
          numberOfLines={locals.numberOfLines}
          underlineColorAndroid={locals.underlineColorAndroid}
          clearButtonMode={locals.clearButtonMode}
          clearTextOnFocus={locals.clearTextOnFocus}
          enablesReturnKeyAutomatically={locals.enablesReturnKeyAutomatically}
          keyboardAppearance={locals.keyboardAppearance}
          onKeyPress={locals.onKeyPress}
          returnKeyType={locals.returnKeyType}
          selectionState={locals.selectionState}
          onChangeText={(value) => {
            if (locals.keyboardType === 'numeric') {
              locals.onChange(parseInt(value) || 0);
            } else {
              locals.onChange(value);
            }
          }}
          placeholder={locals.placeholder}
          // style={[textboxStyle, locals.help ? textboxWithHelpStyle : null]}
          style={[textboxStyle, help ? {width: Dimensions.get('window').width - 54 } : {}]}
          value={locals.value}
        />
        {help}
      </View>
      {error}
    </View>
  );
};

module.exports = textbox;
