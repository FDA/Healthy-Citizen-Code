import React, {PropTypes} from 'react';
import {
  View
} from 'react-native';
import {
  Spinner
} from 'native-base';

import styles from './LoaderViewStyles';

const Loader = ({isShowed}) => (
  isShowed ?
    <View
      style={styles.loaderContainer}
    >
      <Spinner
        color='blue'
      />
    </View>
    : null
);

Loader.propTypes = {
  isShowed: PropTypes.bool
};

export default Loader;