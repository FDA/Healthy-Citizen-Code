import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {
  View,
  Text,
  AppState,
  Dimensions
} from 'react-native';
import {
  Container,
  Content,
  Spinner
} from 'native-base';
import {NavigationActions} from 'react-navigation';
import Orientation from 'react-native-orientation';
import LinearGradient from 'react-native-linear-gradient';
import {getStorageItem, setStorageItem, removeStorageItem, clearUserData} from '../../../services/globalStorage';
import {getOption, setOption} from '../../../services/localStorage';
import {checkToken} from '../../../services/auth';
import AuthKeyboard from './AuthKeyboard';
import styles from './AuthPinCodeViewStyles';
import { getNewAuthByStoredCredentials, saveAuth, reAuth } from '../../../services/auth';

class AuthPinCodeView extends Component {
  constructor(props) {
    super(props);

    this.state = {
      loaded: false,
      appState: 1,
      mode: props.navigation.state.params.action === 'setPinCode' ? 'set' : 'unlock',
      step: 1,
      attempts: getOption('attempts') || 0,
      disabled: false,
      pinCode: '',
      retryPinCode: ''
    };

    this.numberOfAttempts = 3;
    this.numberOfPin = 4;

    this._window = Dimensions.get('window');

    // this._handleAppStateChange = this._handleAppStateChange.bind(this);
    this.onUnlockAuth = this.onUnlockAuth.bind(this);
    this.goToDashboard = this.goToDashboard.bind(this);
    this.skip = this.skip.bind(this);
    this.keyNumberPress = this.keyNumberPress.bind(this);
    this.deleteNumber = this.deleteNumber.bind(this);
    this.savePinCode = this.savePinCode.bind(this);
    this.checkPinCode = this.checkPinCode.bind(this);
    this.goToNextScreen = this.goToNextScreen.bind(this);
    this.lockPinCode = this.lockPinCode.bind(this);
  }

  static navigationOptions = {
    header: null
  };

  componentDidMount() {
    const {mode} = this.state;

    Orientation.lockToPortrait();

    if (mode === 'unlock') {
      this.onUnlockAuth();
    } else {
      this.setState({
        loaded: true
      });
    }
  }

  componentWillUnmount() {
    Orientation.unlockAllOrientations();
  }

  async onUnlockAuth() {
    await reAuth();
    this.setState({
      loaded: true
    });
  }

  goToDashboard() {
    const {navigation, interfaces} = this.props;
    const firstMenuRoute = interfaces[0];

    navigation.dispatch(
      NavigationActions.reset({
        index: 0,
        actions: [
          NavigationActions.navigate({
            routeName: firstMenuRoute.route,
            params: firstMenuRoute.params
          })
        ]
      })
    );
  }

  skip() {
    setStorageItem('skipPinCode', 1)
      .then(() => {
        this.goToNextScreen();
      });
  }

  keyNumberPress(key) {
    const {mode, step, pinCode, retryPinCode} = this.state;

    if (mode === 'set') {
      const currentStepName = step === 1 ? 'pinCode' : 'retryPinCode';
      const nextValue = `${this.state[currentStepName]}${key}`;

      this.setState({
        [currentStepName]: nextValue,
        step: step === 1 && nextValue.length === this.numberOfPin ? 2 : step,
        disabled: step === 2 && nextValue.length === this.numberOfPin,
        error: null
      });

      if (
        step === 2 &&
        pinCode.length === this.numberOfPin &&
        nextValue.length === this.numberOfPin
      ) {
        this.savePinCode(pinCode, nextValue);
      }
    } else {
      const nextValue = `${pinCode}${key}`;

      this.setState({
        pinCode: nextValue,
        disabled: nextValue.length === this.numberOfPin,
        error: null
      });

      if (nextValue.length === this.numberOfPin) {
        this.checkPinCode(nextValue);
      }
    }
  }

  deleteNumber() {
    const {step} = this.state;

    const currentStepName = step === 1 ? 'pinCode' : 'retryPinCode';

    if (!this.state[currentStepName].length) {
      return false;
    }

    const nextValue = this.state[currentStepName].slice(0, -1);

    this.setState({
      [currentStepName]: nextValue
    });
  }

  savePinCode(pinCode, retryPinCode) {
    if (
      !pinCode.length ||
      pinCode !== retryPinCode
    ) {
      this.setState({
        error: 'PIN codes are different. Try again.',
        step: 1,
        pinCode: '',
        retryPinCode: '',
        disabled: false
      });

      return false;
    }

    Promise.all([
      setStorageItem('token', getOption('token')),
      setStorageItem('piiId', getOption('piiId')),
      setStorageItem('phiId', getOption('phiId')),
      setStorageItem('pinCode', pinCode),
      removeStorageItem('skipPinCode'),
      removeStorageItem('attempts')
    ]).then(() => {
      this.goToNextScreen();
    });
  }

  getPinCode() {
    return (getOption('pinCode') || '').toString();
  }

  checkPinCode(pinCode) {
    const {attempts} = this.state;

    if (this.getPinCode() !== pinCode) {
      if (attempts + 1 >= this.numberOfAttempts) {
        this.lockPinCode();

        this.setState({
          attempts: attempts + 1,
          error: 'PIN code is incorrect.\nAuthorization is blocked.\nAuthorize again.'
        });

        return false;
      }

      const newAttempts = attempts + 1;

      this.setState({
        error: 'Incorrect PIN code. Try again.',
        pinCode: '',
        disabled: false,
        attempts: newAttempts
      });

      setStorageItem('attempts', newAttempts).done();

      return false;
    }

    Promise.all([
      getStorageItem('token'),
      getStorageItem('piiId'),
      getStorageItem('phiId'),
      removeStorageItem('attempts'),
      new Promise(resolve => setTimeout(() => resolve(), 10))
    ])
      .then(() => {
        this.goToNextScreen();
      });
  }

  goToNextScreen() {
    const {navigation, isReceived, unlockMenu} = this.props;
    const routes = navigation.state.params.routes;

    if (routes && isReceived) {
      unlockMenu();

      navigation.dispatch(
        NavigationActions.reset({
          index: routes.length - 1,
          actions: routes.map(route => (
            NavigationActions.navigate({
              routeName: route.routeName,
              params: route.params
            })
          ))
        })
      );

      return false;
    }

    navigation.dispatch(
      NavigationActions.reset({
        index: 0,
        actions: [
          NavigationActions.navigate({
            routeName: 'ResourceLoading'
          })
        ]
      })
    );
  }

  lockPinCode(skipTimeout = false) {
    const {logout, lockMenu} = this.props;

    lockMenu();

    Promise.all([
      clearUserData(),
      new Promise(resolve => skipTimeout ? resolve() : setTimeout(() => resolve(), 5000))
    ]).then(() => {
      logout();
    });
  }

  render() {
    const {loaded, mode, attempts, disabled, step, pinCode, retryPinCode, error} = this.state;

    const remainingAttempts = this.numberOfAttempts - attempts;

    if (!loaded) {
      return (
        <Container
          style={styles.container}
        >
          <LinearGradient
            colors={['#90ebff', '#52bbe2']}
            style={styles.gradientContainer}
          >
            <Content
              contentContainerStyle={styles.content}
            >
              <View
                style={styles.loadingContainer}
              >
                <Text
                  style={styles.loadingText}
                >
                  Authentication checking...
                </Text>
                <Spinner
                  color='blue'
                />
              </View>
            </Content>
          </LinearGradient>
        </Container>
      );
    }

    return (
      <Container
        style={styles.container}
      >
        <LinearGradient
          colors={['#90ebff', '#52bbe2']}
          style={styles.gradientContainer}
        >
          <Content
            contentContainerStyle={styles.content}
          >
            <View
              style={styles.form}
            >
              <Text
                style={styles.title}
              >
                {
                  mode === 'set'
                    ? step === 1
                    ? 'Set PIN code'
                    : 'Retry PIN code'
                    : 'Enter your PIN'
                }
              </Text>
              <View
                style={styles.result}
              >
                {
                  Array.apply(null, {length: mode === 'unlock' ? this.getPinCode().length : this.numberOfPin}).map(Number.call, Number).map((item, key) => (
                    <View
                      key={key}
                      style={[
                        styles.resultItem,
                        step === 1 && pinCode.charAt(key) ? styles.resultItemSelected : null,
                        step === 2 && retryPinCode.charAt(key) ? styles.resultItemSelected : null
                      ]}
                    />
                  ))
                }
              </View>
              <View
                style={styles.resultTextContainer}
              >
                {
                  mode === 'unlock' ?
                    <Text
                      style={styles.attemptsText}
                    >
                      {remainingAttempts} attempt{remainingAttempts > 1 ? 's' : ''} remaining
                    </Text>
                    : null
                }
                  {error &&
                  <Text
                      style={styles.errorText}
                  >
                      {error || ''}
                  </Text>
                  }
              </View>
              <AuthKeyboard
                keyNumberPress={this.keyNumberPress}
                deleteNumber={this.deleteNumber}
                skip={this.skip}
                lockPinCode={this.lockPinCode}
                goToDashboard={this.goToDashboard}
                mode={mode}
                skipPinCode={!!getOption('skipPinCode')}
                disabled={disabled}
                _window={this._window}
              />
            </View>
          </Content>
        </LinearGradient>
      </Container>
    );
  }
}

AuthPinCodeView.propTypes = {
  authNoAlert: PropTypes.func.isRequired,
  logout: PropTypes.func.isRequired,
  lockMenu: PropTypes.func.isRequired,
  unlockMenu: PropTypes.func.isRequired,
  isReceived: PropTypes.bool.isRequired
};

export default AuthPinCodeView;
