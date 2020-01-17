import {AppRegistry} from 'react-native';
import App from './src/containers/AppContainer';
import 'react-native-console-time-polyfill';
console.disableYellowBox = true;
AppRegistry.registerComponent('ADP', () => App);

// import React from 'react'
// if (process.env.NODE_ENV !== 'production') {
//   const {whyDidYouUpdate} = require('why-did-you-update');
//   whyDidYouUpdate(React, { exclude: /^YellowBox/ });
// }
