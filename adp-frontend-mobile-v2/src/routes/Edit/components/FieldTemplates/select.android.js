import React from 'react';
import {
  View,
  Text,
  Picker,
  Dimensions
} from 'react-native';
import Hint from '../FieldTemplates/hint';

function select(locals) {
  if (locals.hidden) {
    return null;
  }

  const stylesheet = locals.stylesheet;
  let formGroupStyle = stylesheet.formGroup.normal;
  let controlLabelStyle = stylesheet.controlLabel.normal;
  let selectStyle = Object.assign({}, stylesheet.select.normal, stylesheet.pickerContainer.normal);
  let helpBlockStyle = stylesheet.helpBlock.normal;
  const errorBlockStyle = stylesheet.errorBlock;

  if (locals.hasError) {
    formGroupStyle = stylesheet.formGroup.error;
    controlLabelStyle = stylesheet.controlLabel.error;
    selectStyle = stylesheet.select.error;
    helpBlockStyle = stylesheet.helpBlock.error;
  }

  const label = locals.label ? <Text style={controlLabelStyle}>{locals.label}</Text> : null;
  const help = locals.help ? <Hint>{locals.help}</Hint> : null;
  const error = locals.hasError && locals.error ? <Text accessibilityLiveRegion="polite" style={errorBlockStyle}>{locals.error}</Text> : null;

  const options = locals.options.map(({value, text}) => <Picker.Item key={value} value={value} label={text} />);

  return (
    <View style={formGroupStyle}>
      {label}
      <View>
        <Picker
          accessibilityLabel={locals.label}
          ref="input"
          style={[selectStyle, help ? {width: Dimensions.get('window').width - 54 } : {}]}
          // style={[selectStyle, help ? {marginRight: 40} : null]}
          selectedValue={locals.value}
          onValueChange={locals.onChange}
          help={locals.help}
          enabled={locals.enabled}
          mode={locals.mode}
          prompt={locals.prompt}
          itemStyle={locals.itemStyle}
        >
          {options}
        </Picker>
        {help}
      </View>
      {error}
    </View>
  );
}

module.exports = select;
