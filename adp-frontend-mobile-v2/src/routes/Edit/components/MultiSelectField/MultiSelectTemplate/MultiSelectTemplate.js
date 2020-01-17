import React from 'react';
import {
  View,
  Text as ReactText,
  Platform,
  TouchableHighlight
} from 'react-native';
import {
  Button,
  Text,
  Icon
} from 'native-base';
import Hint from '../../FieldTemplates/hint';
import styles from './MultiSelectTemplateStyles';

const MultiSelectFieldTemplate = (locals) => {
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
    textboxViewStyle = stylesheet.textboxView.error;
  }

  if (locals.editable === false) {
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
          locals.value && Array.isArray(locals.value) && locals.value.length ?
            <View style={[styles.content, locals.help ? styles.contentWithHelp : null]}>
              <TouchableHighlight
                style={styles.touchable}
                onPress={() => locals.openMultiSelectView(locals.label, locals.path.join('/'), locals.value, locals.enums)}>
                <View style={styles.list}>
                  {
                    locals.value.map((item, key) => (
                      <Text key={key} style={styles.item}>
                        {locals.enums[item]}
                      </Text>
                    ))
                  }
                </View>
              </TouchableHighlight>
            </View> :
            <Button
              onPress={() => locals.openMultiSelectView(locals.label, locals.path.join('/'), locals.value, locals.enums)}
              block
              bordered
              lookup
              style={styles.fullButton}
            >
              <Text>Select items</Text>
            </Button>
        }
        {help}
      </View>
      {error}
    </View>
  );
};

export default MultiSelectFieldTemplate;