import React from 'react';
import {
  Platform,
  View
} from 'react-native';

import KeyboardSpacer from 'react-native-keyboard-spacer';

const PlatformAwareKeyboardSpacer = (props) => {
  if (Platform.OS === 'android') {
    return <View />;
  }

  return (
    <KeyboardSpacer
      {...props}
    />
  );
};

export default PlatformAwareKeyboardSpacer;
