import React, {Component, PropTypes} from 'react';
import {
  Text,
  View,
  TextInput,
  Animated,
  Image
} from 'react-native';
import {
  Container,
  Content,
  Button
} from 'native-base';
import LinearGradient from 'react-native-linear-gradient';
import Orientation from 'react-native-orientation';
import {NavigationActions} from 'react-navigation';
import logger from '../../../services/logger';
import KeyboardSpacer from '../../../components/KeyboardSpacer';
import {setStorageItem, clearUserData} from '../../../services/globalStorage';
import {getOption, setOption} from '../../../services/localStorage';
import styles from './AuthViewStyles';

class AuthView extends Component {
  constructor() {
    super();

    this.options = {
      submitBtnContainerBottomSizes: [-50, 0]
    };

    this.state = {
      loginField: '',
      passField: '',
      submitBtnContainerBottom: new Animated.Value(this.options.submitBtnContainerBottomSizes[0]),
      submitBtnContainerOpacity: new Animated.Value(0),
      isValidatedForm: false,
      isDisabled: false
    };

    this.checkAction = this.checkAction.bind(this);
    this.checkFormValidation = this.checkFormValidation.bind(this);
    this.auth = this.auth.bind(this);
    this.changeField = this.changeField.bind(this);
    this.focusNextField = this.focusNextField.bind(this);
  }

  static navigationOptions = {
    header: {
      visible: false
    }
  };

  componentDidMount() {
    Orientation.lockToPortrait();

    this.checkAction();
  }

  componentWillUnmount() {
    Orientation.unlockAllOrientations();
  }

  checkAction() {
    const {navigation, logout} = this.props;

    const action = navigation.state.params ? navigation.state.params.action || null : null;

    if (action && action === 'logout') {
      logout();

      clearUserData();
    }
  }

  checkFormValidation() {
    const {loginField, passField} = this.state;

    return loginField.length && passField.length;
  }

  auth() {
    const {navigation, auth} = this.props;
    const {isDisabled, loginField, passField} = this.state;

    if (!isDisabled && this.checkFormValidation()) {
      this.setState({
        isDisabled: true
      });

      auth(loginField, passField)
        .then(authResponse => {
          setOption('token', authResponse.token);
          setStorageItem('token', authResponse.token);
          setOption('piiId', authResponse.user.piiId);
          setStorageItem('piiId', authResponse.user.piiId);
          setOption('phiId', authResponse.user.phiId);
          setStorageItem('phiId', authResponse.user.phiId);

          if (getOption('pinCode') || getOption('skipPinCode')) {
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
          } else {
            navigation.navigate('AuthPinCode', {
              action: 'setPinCode'
            });
          }
        })
        .catch(error => {
          this.setState({
            isDisabled: false
          });

          logger.error(error);
        });
    }
  }

  changeField(field, text) {
    this.setState({
      [field]: text
    });

    setTimeout(() => {
      const isValidatedForm = this.checkFormValidation();

      if (this.state.isValidatedForm !== isValidatedForm) {
        this.setState({
          isValidatedForm: isValidatedForm
        });

        Animated.parallel([
          Animated.spring(this.state.submitBtnContainerBottom, {
            toValue: isValidatedForm ?
              this.options.submitBtnContainerBottomSizes[1] :
              this.options.submitBtnContainerBottomSizes[0]
          }),
          Animated.spring(this.state.submitBtnContainerOpacity, {
            toValue: isValidatedForm ? 1 : 0
          })
        ]).start();
      }
    });
  }

  focusNextField(nextField) {
    this.refs[nextField].focus();
  };

  render() {
    const {isDisabled} = this.state;

    return (
      <Container
        style={styles.container}
      >
        <LinearGradient
          colors={['#5BC9F5', '#EFEFF4']}
          style={styles.gradientContainer}
        >
          <Content
            contentContainerStyle={styles.content}
            extraScrollHeight={10}
            keyboardShouldPersistTaps='always'
            keyboardDismissMode='on-drag'
          >
            <View
              style={styles.logoContainer}
            >
              <Image
                style={styles.logo}
                source={require('./assets/logo.png')}
              />
            </View>
            <View
              style={styles.form}
            >
              <View
                style={styles.row}
              >
                <TextInput
                  ref='loginField'
                  style={styles.field}
                  placeholder='Login'
                  autoCorrect={false}
                  selectionColor='#000'
                  textAlignVertical='center'
                  underlineColorAndroid='transparent'
                  editable={!isDisabled}
                  onChangeText={(text) => this.changeField('loginField', text)}
                  returnKeyType='next'
                  autoFocus={true}
                  autoCapitalize='none'
                  onEndEditing={() => this.focusNextField('passField')}
                />
              </View>
              <View
                style={styles.row}
              >
                <TextInput
                  ref='passField'
                  style={styles.field}
                  placeholder='Password'
                  autoCorrect={false}
                  secureTextEntry={true}
                  selectionColor='#000'
                  textAlignVertical='center'
                  underlineColorAndroid='transparent'
                  value={this.state.passField}
                  editable={!isDisabled}
                  onChangeText={(text) => this.changeField('passField', text)}
                  returnKeyType='go'
                  autoCapitalize='none'
                  //onEndEditing={() => this.auth()}
                />
              </View>
            </View>
          </Content>
        </LinearGradient>
        <Animated.View
          style={[styles.submitBtnContainer, {
            bottom: this.state.submitBtnContainerBottom,
            opacity: this.state.submitBtnContainerOpacity
          }]}
        >
          <Button
            style={styles.submitBtn}
            onPress={() => this.auth()}
            full
            info
          >
            <Text
              style={styles.submitBtnText}
            >
              {
                isDisabled
                  ? 'Loading...'
                  : 'Sign In'
              }
            </Text>
          </Button>
          <KeyboardSpacer/>
        </Animated.View>
      </Container>
    );
  }
}

AuthView.propTypes = {
  logout: PropTypes.func.isRequired,
  auth: PropTypes.func.isRequired
};

export default AuthView;