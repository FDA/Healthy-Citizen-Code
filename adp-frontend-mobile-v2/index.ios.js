import {AppRegistry} from 'react-native';
import App from './src/containers/AppContainer';
import 'react-native-console-time-polyfill';
console.disableYellowBox = true;
AppRegistry.registerComponent('ADP', () => App);
