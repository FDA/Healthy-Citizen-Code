import React from 'react';
import {
  View,
  Text as ReactText,
  TextInput,
  Dimensions
} from 'react-native';
import {
  Button,
  Text
} from 'native-base';
import Hint from '../../FieldTemplates/hint';
import styles from './LookupTemplateStyles';
import _ from 'lodash';

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

  const valuesLabel = getLabel(locals);
  return (
    <View style={formGroupStyle}>
      {label}
      <View style={[textboxViewStyle, styles.container]}>
        {
          valuesLabel ?
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
                value={valuesLabel}
              />
              <Button
                onPress={() => locals.openLookupView(locals.path.join('/'), valuesLabel, locals.lookupId, locals.isMultiple)}
                light
              >
                <Text>Change</Text>
              </Button>
            </View>:
            <Button
              onPress={() => locals.openLookupView(locals.path.join('/'), valuesLabel, locals.lookupId, locals.isMultiple)}
              block
              bordered
              lookup
              style={[styles.fullButton, help ? {width: Dimensions.get('window').width - 54 } : {}]}
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

/**
 * For Lookup[] it can be array values.
 * The reason is undefined, but 'value.label' can be an array with 1 element.
 * @returns {*}
 */
function getLabel(locals) {
  const labels = Array.isArray(locals.value) ? locals.value.map(v => v.label) : locals.value ? [locals.value.label] : [];
  const resultLabelParts = [];
  labels.forEach(label => {
    const singleLabelVal = (Array.isArray(label) ? label[0] : label) || '';
    resultLabelParts.push(singleLabelVal);
  });

  return resultLabelParts.join(', ');
}

export default LookupFieldTemplate;