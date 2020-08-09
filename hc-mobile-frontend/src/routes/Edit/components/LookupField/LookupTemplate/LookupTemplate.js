import React from 'react';
import {
  View,
  Text as ReactText,
  TextInput
} from 'react-native';
import {
  Button,
  Text
} from 'native-base';
import Hint from '../../FieldTemplates/hint';
import styles from './LookupTemplateStyles';

const LookupFieldTemplate = (locals) => {
  if (locals.hidden) {
    return null;
  }

  const stylesheet = locals.stylesheet;
  let formGroupStyle = stylesheet.formGroup.normal;
  let controlLabelStyle = stylesheet.controlLabel.normal;
  let textboxStyle = stylesheet.textbox.normal;
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

  const label = locals.label
    ? <ReactText style={controlLabelStyle}>{locals.label}</ReactText>
    : null;
  const help = locals.help
    ? <Hint>{locals.help}</Hint>
    : null;
  const error = locals.hasError && locals.error
    ? <ReactText accessibilityLiveRegion='polite' style={errorBlockStyle}>{locals.error}</ReactText>
    : null;

  return (
    <View style={formGroupStyle}>
      {label}
      <View style={[textboxViewStyle, styles.container]}>
        {
          locals.value && locals.value.label ?
            <View
              style={[styles.content, locals.help ? styles.contentWithHelp : null]}
            >
              <TextInput
                accessibilityLabel={locals.label}
                ref='input'
                autoCapitalize='none'
                autoCorrect={false}
                editable={false}
                keyboardType={locals.keyboardType}
                multiline={locals.multiline}
                onLayout={locals.onLayout}
                onContentSizeChange={locals.onContentSizeChange}
                placeholderTextColor={locals.placeholderTextColor}
                secureTextEntry={locals.secureTextEntry}
                numberOfLines={locals.numberOfLines}
                underlineColorAndroid={locals.underlineColorAndroid}
                clearButtonMode={locals.clearButtonMode}
                clearTextOnFocus={locals.clearTextOnFocus}
                placeholder={locals.placeholder}
                style={[textboxStyle, styles.field]}
                value={locals.value ? locals.value.label : null}
              />
              <Button
                onPress={() => locals.openLookupView(locals.path.join('/'), locals.value, locals.lookupId)}
                light
              >
                <Text>Change</Text>
              </Button>
            </View>:
            <Button
              onPress={() => locals.openLookupView(locals.path.join('/'), locals.value, locals.lookupId)}
              block
              bordered
              lookup
              style={styles.fullButton}
            >
              <Text>Select item</Text>
            </Button>
        }
        {help}
      </View>
      {error}
    </View>
  );
};

export default LookupFieldTemplate;