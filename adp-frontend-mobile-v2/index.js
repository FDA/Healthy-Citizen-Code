// since react-native 0.49 it requires only one file index.js
import {AppRegistry} from 'react-native';
import App from './src/containers/AppContainer';
import 'react-native-console-time-polyfill';
console.disableYellowBox = true;
AppRegistry.registerComponent('ADP', () => App);

// connect performance tool: https://medium.freecodecamp.org/make-react-fast-again-tools-and-techniques-for-speeding-up-your-react-app-7ad39d3c1b82
// import React from 'react'
// if (process.env.NODE_ENV !== 'production') {
//   const {whyDidYouUpdate} = require('why-did-you-update');
//   whyDidYouUpdate(React, { exclude: /^YellowBox/ });
// }
