import {
  View,
  Image
} from 'react-native';
import React from 'react';

export default getBackgroundImage = (backgroundImageSrc) => (
  <View
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
    }}
  >
    <Image
      style={{
        flex: 1,
        resizeMode: 'cover'
      }}
      source={{uri: backgroundImageSrc}}
    />
  </View>
);
