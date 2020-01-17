import React from 'react';
import PropTypes from 'prop-types';
import {
  View
} from 'react-native';
import {
  Spinner
} from 'native-base';

import styles from './LoaderViewStyles';
import pure from 'recompose/pure';

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

export default pure(Loader);
